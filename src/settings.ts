import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type LlmTitleGeneratorPlugin from "./main";
import { createChatCompletion } from "./services/llm/openaiChatCompletions";

export interface LlmTitleGeneratorSettings {
	apiKey: string;
	baseUrl: string;
	model: string;

	systemPrompt: string;
	userPromptTemplate: string;

	maxInputChars: number;
	maxTitleChars: number;

	temperature: number;
	maxTokens: number;

	confirmBeforeSend: boolean;
	confirmBeforeBatch: boolean;

	vaultBatchLimit: number;
	delayMsBetweenRequests: number;
	requestTimeoutMs: number;
}

export const DEFAULT_SETTINGS: LlmTitleGeneratorSettings = {
	apiKey: "",
	baseUrl: "https://api.openai.com/v1",
	model: "gpt-4o-mini",

	systemPrompt: [
		"你是一个写作与整理助手。",
		"任务：根据给定的 Obsidian 笔记内容，为该笔记生成一个适合作为“文件名”的标题。",
		"要求：只输出标题本身，不要解释，不要加引号，不要换行。",
	].join("\n"),

	userPromptTemplate: [
		"请生成一个标题：",
		`- 只输出标题文本（不要“标题：”前缀）`,
		`- 不要包含引号/书名号/反引号`,
		`- 不要包含换行`,
		`- 尽量使用笔记主要语言（中文/英文）`,
		`- 标题不超过 {{maxTitleChars}} 个字符`,
		`- 避免使用文件名非法字符：\\ / : * ? \" < > |`,
		`- 不要以句号/冒号等结尾标点收尾`,
		"",
		"笔记内容片段如下：",
		"----- BEGIN NOTE -----",
		"{{noteSnippet}}",
		"----- END NOTE -----",
	].join("\n"),

	maxInputChars: 3000,
	maxTitleChars: 60,

	temperature: 0.2,
	maxTokens: 64,

	confirmBeforeSend: true,
	confirmBeforeBatch: true,

	vaultBatchLimit: 0,
	delayMsBetweenRequests: 0,
	requestTimeoutMs: 60_000,
};

function clampNumber(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function parseNumberOrFallback(
	raw: string,
	fallback: number,
	options: { min: number; max: number },
) {
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) return fallback;
	return clampNumber(parsed, options.min, options.max);
}

export class LlmTitleGeneratorSettingTab extends PluginSettingTab {
	plugin: LlmTitleGeneratorPlugin;

	constructor(app: App, plugin: LlmTitleGeneratorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "LLM 标题生成" });

		containerEl.createEl("p", {
			text:
				"注意：该插件会把笔记内容片段发送到你配置的 LLM 接口。API Key 会保存在本地 data.json 中（未加密）。",
		});

		new Setting(containerEl)
			.setName("Base URL")
			.setDesc("OpenAI 兼容接口地址，例如：https://api.openai.com/v1")
			.addText((text) =>
				text
					.setPlaceholder("https://api.openai.com/v1")
					.setValue(this.plugin.settings.baseUrl)
					.onChange(async (value) => {
						this.plugin.settings.baseUrl = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("API key")
			.setDesc("用于 Authorization: Bearer <API key>")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("sk-...")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Model")
			.setDesc("chat/completions 的 model 字段")
			.addText((text) =>
				text
					.setPlaceholder("gpt-4o-mini")
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		containerEl.createEl("h3", { text: "提示词" });

		new Setting(containerEl)
			.setName("System prompt")
			.setDesc("用于 system role。支持变量：{{maxTitleChars}}。")
			.addTextArea((text) => {
				text.inputEl.rows = 5;
				text.setValue(this.plugin.settings.systemPrompt).onChange(async (value) => {
					this.plugin.settings.systemPrompt = value;
					await this.plugin.saveSettings();
				});
			})
			.addButton((btn) =>
				btn.setButtonText("重置").onClick(async () => {
					this.plugin.settings.systemPrompt = DEFAULT_SETTINGS.systemPrompt;
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		new Setting(containerEl)
			.setName("User prompt template")
			.setDesc("用于 user role。支持变量：{{maxTitleChars}}、{{noteSnippet}}。")
			.addTextArea((text) => {
				text.inputEl.rows = 12;
				text.setValue(this.plugin.settings.userPromptTemplate).onChange(async (value) => {
					this.plugin.settings.userPromptTemplate = value;
					await this.plugin.saveSettings();
				});
			})
			.addButton((btn) =>
				btn.setButtonText("重置").onClick(async () => {
					this.plugin.settings.userPromptTemplate = DEFAULT_SETTINGS.userPromptTemplate;
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		new Setting(containerEl)
			.setName("测试 API 配置")
			.setDesc("向 /chat/completions 发送一条最小测试消息，用于检查 Base URL / Key / Model 是否可用。")
			.addButton((btn) =>
				btn.setButtonText("测试").setCta().onClick(async () => {
					try {
						const content = await createChatCompletion(
							{ ...this.plugin.settings, maxTokens: Math.min(16, this.plugin.settings.maxTokens) },
							[
								{ role: "system", content: "You are a helpful assistant." },
								{ role: "user", content: "Reply with OK only." },
							],
						);
						const preview = content.trim().slice(0, 80);
						new Notice(`测试成功：${preview || "OK"}`);
					} catch (err) {
						const message = err instanceof Error ? err.message : String(err);
						new Notice(`测试失败：${message}`);
					}
				}),
			);

		new Setting(containerEl)
			.setName("最大输入字符数")
			.setDesc("默认发送每条笔记前 N 个字符")
			.addText((text) =>
				text
					.setPlaceholder("3000")
					.setValue(String(this.plugin.settings.maxInputChars))
					.onChange(async (value) => {
						this.plugin.settings.maxInputChars = parseNumberOrFallback(value, 3000, {
							min: 100,
							max: 100_000,
						});
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("标题最大字符数")
			.setDesc("用于限制生成标题与文件名长度")
			.addText((text) =>
				text
					.setPlaceholder("60")
					.setValue(String(this.plugin.settings.maxTitleChars))
					.onChange(async (value) => {
						this.plugin.settings.maxTitleChars = parseNumberOrFallback(value, 60, {
							min: 5,
							max: 200,
						});
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Temperature")
			.setDesc("建议 0~0.5（更稳定）")
			.addText((text) =>
				text
					.setPlaceholder("0.2")
					.setValue(String(this.plugin.settings.temperature))
					.onChange(async (value) => {
						this.plugin.settings.temperature = parseNumberOrFallback(value, 0.2, {
							min: 0,
							max: 2,
						});
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("max_tokens")
			.setDesc("限制输出长度（标题一般很短）")
			.addText((text) =>
				text
					.setPlaceholder("64")
					.setValue(String(this.plugin.settings.maxTokens))
					.onChange(async (value) => {
						this.plugin.settings.maxTokens = parseNumberOrFallback(value, 64, {
							min: 16,
							max: 512,
						});
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("发送前确认（单文件）")
			.setDesc("执行命令前弹窗确认将要发送的内容片段")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.confirmBeforeSend).onChange(async (value) => {
					this.plugin.settings.confirmBeforeSend = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("批量前确认（多选/全库）")
			.setDesc("批量重命名前弹窗确认")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.confirmBeforeBatch)
					.onChange(async (value) => {
						this.plugin.settings.confirmBeforeBatch = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("全库批量上限")
			.setDesc("0 表示不限制（不推荐），否则只处理前 N 篇")
			.addText((text) =>
				text
					.setPlaceholder("0")
					.setValue(String(this.plugin.settings.vaultBatchLimit))
					.onChange(async (value) => {
						this.plugin.settings.vaultBatchLimit = parseNumberOrFallback(value, 0, {
							min: 0,
							max: 100_000,
						});
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("请求间隔（毫秒）")
			.setDesc("批量时每次请求之间的等待时间，用于降速/避开限流")
			.addText((text) =>
				text
					.setPlaceholder("0")
					.setValue(String(this.plugin.settings.delayMsBetweenRequests))
					.onChange(async (value) => {
						this.plugin.settings.delayMsBetweenRequests = parseNumberOrFallback(value, 0, {
							min: 0,
							max: 60_000,
						});
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("请求超时（毫秒）")
			.setDesc("超过该时间仍未返回则判定失败（不会中止网络请求）")
			.addText((text) =>
				text
					.setPlaceholder("60000")
					.setValue(String(this.plugin.settings.requestTimeoutMs))
					.onChange(async (value) => {
						this.plugin.settings.requestTimeoutMs = parseNumberOrFallback(value, 60_000, {
							min: 5_000,
							max: 10 * 60_000,
						});
						await this.plugin.saveSettings();
					}),
			);
	}
}
