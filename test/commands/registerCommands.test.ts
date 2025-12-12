import "../setup";

import { describe, it, mock } from "../harness";
import * as assert from "node:assert/strict";

import { TFile, __getNotices, __setRequestUrlMock } from "../__mocks__/obsidian";

import { registerCommands } from "../../src/commands/registerCommands";
import { DEFAULT_SETTINGS } from "../../src/settings";

function createPlugin(options?: {
	activeFilePath?: string | null;
	markdownFiles?: string[];
	contentsByPath?: Record<string, string>;
	settings?: Partial<any>;
}) {
	const contentsByPath = options?.contentsByPath ?? {};
	const existingPaths = new Set<string>(options?.markdownFiles ?? []);
	if (options?.activeFilePath) existingPaths.add(options.activeFilePath);
	for (const p of Object.keys(contentsByPath)) existingPaths.add(p);

	const filesByPath = new Map<string, TFile>();
	for (const p of existingPaths) filesByPath.set(p, new TFile(p));

	const commands: any[] = [];

	const plugin: any = {
		settings: {
			...DEFAULT_SETTINGS,
			apiKey: "sk-test",
			baseUrl: "https://example.com/v1",
			model: "gpt-test",
			confirmBeforeSend: false,
			confirmBeforeBatch: false,
			...(options?.settings ?? {}),
		},
		addCommand: (cmd: any) => commands.push(cmd),
		app: {
			workspace: {
				getActiveFile: () => {
					if (options?.activeFilePath === null) return null;
					if (!options?.activeFilePath) return null;
					return filesByPath.get(options.activeFilePath) ?? null;
				},
			},
			vault: {
				getMarkdownFiles: () =>
					(options?.markdownFiles ?? []).map((p) => filesByPath.get(p)!).filter(Boolean),
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
	};

	return { plugin, commands, filesByPath };
}

describe("commands/registerCommands", () => {
	it("registers the expected commands", () => {
		const { plugin, commands } = createPlugin();
		registerCommands(plugin);

		assert.equal(commands.length, 2);
		assert.equal(commands[0]?.id, "llm-title-generator-rename-active-file");
		assert.equal(commands[1]?.id, "llm-title-generator-rename-whole-vault");
	});

	it("shows a notice when no active file is open", async () => {
		const { plugin, commands } = createPlugin({ activeFilePath: null });
		registerCommands(plugin);

		await commands[0]?.callback();
		assert.deepEqual(__getNotices(), ["没有打开的文件。"]);
	});

	it("active-file command runs the workflow and renames", async () => {
		__setRequestUrlMock(async () => {
			return {
				status: 200,
				text: "",
				json: { choices: [{ message: { content: "New Title" } }] },
			};
		});

		const { plugin, commands, filesByPath } = createPlugin({
			activeFilePath: "note.md",
			contentsByPath: { "note.md": "hello" },
		});

		registerCommands(plugin);
		await commands[0]?.callback();

		assert.ok(filesByPath.has("New Title.md"));
		assert.deepEqual(__getNotices(), ["已生成标题并重命名。"]);
	});

	it("vault command runs batch rename (without confirm)", async () => {
		let i = 0;
		__setRequestUrlMock(async () => {
			i++;
			return {
				status: 200,
				text: "",
				json: { choices: [{ message: { content: i === 1 ? "Title A" : "Title B" } }] },
			};
		});

		const { plugin, commands, filesByPath } = createPlugin({
			markdownFiles: ["a.md", "b.md"],
			contentsByPath: { "a.md": "a", "b.md": "b" },
			settings: { confirmBeforeBatch: false },
		});

		registerCommands(plugin);
		await commands[1]?.callback();

		assert.ok(filesByPath.has("Title A.md"));
		assert.ok(filesByPath.has("Title B.md"));
		assert.match(__getNotices().join("\n"), /批量完成：重命名 2，跳过 0，失败 0/);
	});
});
