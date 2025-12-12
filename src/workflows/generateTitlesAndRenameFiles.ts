import { Notice, TFile } from "obsidian";

import type LlmTitleGeneratorPlugin from "../main";
import { createChatCompletion } from "../services/llm/openaiChatCompletions";
import { renameFileWithConflictResolution } from "../services/rename/renameFile";
import { buildTitleMessages } from "../services/title/titleMessages";
import {
	extractTitleFromModelText,
	sanitizeForFilenameBasename,
} from "../services/title/titleSanitizer";
import { BatchProgressModal } from "../ui/progressModal";
import { confirm } from "../ui/confirmModal";
import { stripFrontmatter, takeFirstCharsByCodePoints } from "../utils/noteText";

type Source = "command" | "file-menu" | "files-menu" | "vault";

export async function generateTitlesAndRenameFiles(
	plugin: LlmTitleGeneratorPlugin,
	files: TFile[],
	options: { source: Source },
) {
	const markdownFiles = files.filter((f) => f.extension === "md");
	if (markdownFiles.length === 0) {
		new Notice("没有可处理的 Markdown 文件。");
		return;
	}

	if (options.source === "vault" && plugin.settings.vaultBatchLimit > 0) {
		markdownFiles.sort((a, b) => a.path.localeCompare(b.path));
		markdownFiles.splice(plugin.settings.vaultBatchLimit);
	}

	const isBatch = markdownFiles.length > 1 || options.source === "vault" || options.source === "files-menu";
	if (isBatch && plugin.settings.confirmBeforeBatch) {
		const ok = await confirm(plugin.app, {
			title: "确认批量重命名？",
			message: `将对 ${markdownFiles.length} 个笔记调用 LLM 并重命名文件名。建议先小范围测试。`,
			confirmText: "开始",
			cancelText: "取消",
		});
		if (!ok) return;
	}

	const modal = isBatch ? new BatchProgressModal(plugin.app, markdownFiles.length) : null;
	modal?.open();

	let renamed = 0;
	let skipped = 0;
	let failed = 0;

	for (let i = 0; i < markdownFiles.length; i++) {
		if (modal?.isCancelled()) break;

		const file = markdownFiles[i];
		modal?.update(i + 1, file.path);

		try {
			const noteTextRaw = await plugin.app.vault.cachedRead(file);
			const noteText = stripFrontmatter(noteTextRaw);
			const snippet = takeFirstCharsByCodePoints(noteText, plugin.settings.maxInputChars).trim();

			if (!snippet) {
				skipped++;
				continue;
			}

			if (!isBatch && plugin.settings.confirmBeforeSend) {
				const preview = snippet.length > 300 ? `${snippet.slice(0, 300)}…` : snippet;
				const ok = await confirm(plugin.app, {
					title: "确认发送内容到 LLM？",
					message:
						`文件：${file.path}\n` +
						`将发送前 ${Math.min(snippet.length, plugin.settings.maxInputChars)} 个字符到：${plugin.settings.baseUrl}\n\n` +
						`预览：\n${preview}`,
					confirmText: "发送并重命名",
					cancelText: "取消",
				});
				if (!ok) {
					skipped++;
					continue;
				}
			}

			const messages = buildTitleMessages(snippet, plugin.settings);
			const rawTitle = await createChatCompletion(plugin.settings, messages);
			const extracted = extractTitleFromModelText(rawTitle);
			const newBasename = sanitizeForFilenameBasename(extracted, plugin.settings.maxTitleChars);

			if (newBasename === file.basename) {
				skipped++;
				continue;
			}

			await renameFileWithConflictResolution(plugin, file, newBasename);
			renamed++;
		} catch (err) {
			console.error("LLM title rename failed", { file: markdownFiles[i]?.path, err });
			failed++;
		}

		if (plugin.settings.delayMsBetweenRequests > 0) {
			await new Promise<void>((resolve) =>
				window.setTimeout(resolve, plugin.settings.delayMsBetweenRequests),
			);
		}
	}

	modal?.setSummary([`重命名：${renamed}`, `跳过：${skipped}`, `失败：${failed}`]);
	if (isBatch) {
		new Notice(`批量完成：重命名 ${renamed}，跳过 ${skipped}，失败 ${failed}`);
	} else if (failed > 0) {
		new Notice("生成标题失败，详见控制台。");
	} else if (renamed > 0) {
		new Notice("已生成标题并重命名。");
	} else {
		new Notice("未重命名（可能被取消或标题未变化）。");
	}
}

