import { Notice } from "obsidian";

import type LlmTitleGeneratorPlugin from "../main";
import { generateTitlesAndRenameFiles } from "../workflows/generateTitlesAndRenameFiles";

export function registerCommands(plugin: LlmTitleGeneratorPlugin) {
	plugin.addCommand({
		id: "llm-title-generator-rename-active-file",
		name: "LLM：生成标题并重命名（当前文件）",
		callback: async () => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file) {
				new Notice("没有打开的文件。");
				return;
			}

			await generateTitlesAndRenameFiles(plugin, [file], { source: "command" });
		},
	});

	plugin.addCommand({
		id: "llm-title-generator-rename-whole-vault",
		name: "LLM：批量生成标题并重命名（整个仓库）",
		callback: async () => {
			const files = plugin.app.vault.getMarkdownFiles();
			await generateTitlesAndRenameFiles(plugin, files, { source: "vault" });
		},
	});
}

