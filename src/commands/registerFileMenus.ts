import { Menu, Notice, TAbstractFile, TFile } from "obsidian";

import type LlmTitleGeneratorPlugin from "../main";
import { generateTitlesAndRenameFiles } from "../workflows/generateTitlesAndRenameFiles";

function isMarkdownFile(file: TAbstractFile): file is TFile {
	return file instanceof TFile && file.extension === "md";
}

export function registerFileMenus(plugin: LlmTitleGeneratorPlugin) {
	plugin.registerEvent(
		plugin.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile) => {
			if (!isMarkdownFile(file)) return;

			menu.addItem((item) => {
				item
					.setTitle("LLM：生成标题并重命名")
					.setIcon("pencil")
					.onClick(async () => {
						await generateTitlesAndRenameFiles(plugin, [file], { source: "file-menu" });
					});
			});
		}),
	);

	// Obsidian 在多选文件右键菜单里会触发 "files-menu"（未在所有版本类型定义中暴露）。
	plugin.registerEvent(
		(plugin.app.workspace as any).on(
			"files-menu",
			(menu: Menu, files: TAbstractFile[]) => {
				const markdownFiles = files.filter(isMarkdownFile);
				if (markdownFiles.length === 0) return;

				menu.addItem((item) => {
					item
						.setTitle("LLM：批量生成标题并重命名")
						.setIcon("pencil")
						.onClick(async () => {
							if (markdownFiles.length > 200) {
								new Notice(
									`已选中 ${markdownFiles.length} 个文件（可能较慢/较贵）。建议先小批量测试。`,
								);
							}
							await generateTitlesAndRenameFiles(plugin, markdownFiles, { source: "files-menu" });
						});
				});
			},
		),
	);
}

