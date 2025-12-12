import "../setup";

import { describe, it, mock } from "../harness";
import * as assert from "node:assert/strict";

import { TFile, __getNotices, __setRequestUrlMock } from "../__mocks__/obsidian";

import { generateTitlesAndRenameFiles } from "../../src/workflows/generateTitlesAndRenameFiles";

function createPlugin(options?: {
	settings?: Partial<any>;
	contentsByPath?: Record<string, string>;
	existingPaths?: string[];
}) {
	const contentsByPath = options?.contentsByPath ?? {};
	const existingPaths = new Set<string>(options?.existingPaths ?? Object.keys(contentsByPath));
	const filesByPath = new Map<string, TFile>();

	for (const p of existingPaths) {
		filesByPath.set(p, new TFile(p));
	}

	const plugin: any = {
		app: {
			vault: {
				cachedRead: mock.fn(async (file: TFile) => contentsByPath[file.path] ?? ""),
				getAbstractFileByPath: (p: string) => filesByPath.get(p) ?? null,
			},
			fileManager: {
				renameFile: mock.fn(async (file: TFile, newPath: string) => {
					filesByPath.delete(file.path);
					file.path = newPath;
					filesByPath.set(newPath, new TFile(newPath));
				}),
			},
		},
		settings: {
			apiKey: "sk-test",
			baseUrl: "https://example.com/v1",
			model: "gpt-test",
			maxInputChars: 3000,
			maxTitleChars: 60,
			temperature: 0.2,
			maxTokens: 64,
			confirmBeforeSend: false,
			confirmBeforeBatch: false,
			vaultBatchLimit: 0,
			delayMsBetweenRequests: 0,
			requestTimeoutMs: 60_000,
			...(options?.settings ?? {}),
		},
	};

	return { plugin, filesByPath };
}

describe("workflows/generateTitlesAndRenameFiles", () => {
	it("shows a notice when there are no markdown files", async () => {
		const { plugin } = createPlugin({ existingPaths: ["a.txt"] });
		await generateTitlesAndRenameFiles(plugin, [new TFile("a.txt")] as any, { source: "vault" });
		assert.deepEqual(__getNotices(), ["没有可处理的 Markdown 文件。"]);
	});

	it("renames a single markdown file when LLM returns a valid title", async () => {
		__setRequestUrlMock(async () => {
			return {
				status: 200,
				text: "",
				json: { choices: [{ message: { content: "My Title" } }] },
			};
		});

		const { plugin, filesByPath } = createPlugin({
			existingPaths: ["old.md"],
			contentsByPath: { "old.md": "Some note content" },
		});

		await generateTitlesAndRenameFiles(plugin, [filesByPath.get("old.md")!] as any, { source: "command" });

		assert.ok(filesByPath.has("My Title.md"));
		assert.deepEqual(__getNotices(), ["已生成标题并重命名。"]);
	});

	it("skips empty notes and does not rename", async () => {
		__setRequestUrlMock(async () => {
			return {
				status: 200,
				text: "",
				json: { choices: [{ message: { content: "Should Not Be Used" } }] },
			};
		});

		const { plugin, filesByPath } = createPlugin({
			existingPaths: ["empty.md"],
			contentsByPath: { "empty.md": "   \n\n  " },
		});

		await generateTitlesAndRenameFiles(plugin, [filesByPath.get("empty.md")!] as any, { source: "command" });

		assert.ok(filesByPath.has("empty.md"));
		assert.deepEqual(__getNotices(), ["未重命名（可能被取消或标题未变化）。"]);
	});

	it("handles LLM HTTP errors and reports failure in single-file flow", async () => {
		__setRequestUrlMock(async () => ({ status: 500, text: "oops" }));

		const { plugin, filesByPath } = createPlugin({
			existingPaths: ["old.md"],
			contentsByPath: { "old.md": "Some note content" },
		});

		const originalError = console.error;
		console.error = () => {};
		try {
			await generateTitlesAndRenameFiles(plugin, [filesByPath.get("old.md")!] as any, {
				source: "command",
			});
		} finally {
			console.error = originalError;
		}

		assert.deepEqual(__getNotices(), ["生成标题失败，详见控制台。"]);
	});

	it("respects vaultBatchLimit when source is vault", async () => {
		__setRequestUrlMock(async () => {
			return {
				status: 200,
				text: "",
				json: { choices: [{ message: { content: "Title A" } }] },
			};
		});

		const { plugin, filesByPath } = createPlugin({
			settings: { vaultBatchLimit: 1 },
			existingPaths: ["b.md", "a.md"],
			contentsByPath: { "a.md": "content", "b.md": "content" },
		});

		const files = [filesByPath.get("b.md")!, filesByPath.get("a.md")!];
		await generateTitlesAndRenameFiles(plugin, files as any, { source: "vault" });

		// Only "a.md" should be processed (sorted + limited).
		assert.ok(filesByPath.has("Title A.md"));
		assert.ok(filesByPath.has("b.md"));
	});
});
