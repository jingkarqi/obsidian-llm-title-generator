import type { LlmTitleGeneratorSettings } from "../../settings";
import type { ChatMessage } from "../llm/openaiChatCompletions";

export function buildTitleMessages(
	noteSnippet: string,
	settings: LlmTitleGeneratorSettings,
): ChatMessage[] {
	const system = [
		"你是一个写作与整理助手。",
		"任务：根据给定的 Obsidian 笔记内容，为该笔记生成一个适合作为“文件名”的标题。",
		"要求：只输出标题本身，不要解释，不要加引号，不要换行。",
	].join("\n");

	const user = [
		"请生成一个标题：",
		`- 只输出标题文本（不要“标题：”前缀）`,
		`- 不要包含引号/书名号/反引号`,
		`- 不要包含换行`,
		`- 尽量使用笔记主要语言（中文/英文）`,
		`- 标题不超过 ${settings.maxTitleChars} 个字符`,
		`- 避免使用文件名非法字符：\\ / : * ? \" < > |`,
		`- 不要以句号/冒号等结尾标点收尾`,
		"",
		"笔记内容片段如下：",
		"----- BEGIN NOTE -----",
		noteSnippet,
		"----- END NOTE -----",
	].join("\n");

	return [
		{ role: "system", content: system },
		{ role: "user", content: user },
	];
}

