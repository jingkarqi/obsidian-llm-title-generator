import "../setup";

import { describe, it, mock } from "../harness";
import * as assert from "node:assert/strict";

import { Menu, TFile, __getNotices, __setRequestUrlMock } from "../__mocks__/obsidian";

import { registerFileMenus } from "../../src/commands/registerFileMenus";

function createPlugin(options?: { contentsByPath?: Record<string, string>; settings?: Partial<any> }) {
	const contentsByPath = options?.contentsByPath ?? {};
	const filesByPath = new Map<string, TFile>();
	for (const p of Object.keys(contentsByPath)) filesByPath.set(p, new TFile(p));

	const registered: any[] = [];

	const plugin: any = {
		registerEvent: (ref: any) => registered.push(ref),
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
		app: {
			workspace: {
				on: (event: string, cb: any) => ({ event, cb }),
			},
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
	};

	return { plugin, registered, filesByPath };
}

describe("commands/registerFileMenus", () => {
	it("adds a context menu item for markdown files (file-menu) and runs rename on click", async () => {
		__setRequestUrlMock(async () => {
			return {
				status: 200,
				text: "",
				json: { choices: [{ message: { content: "New Title" } }] },
			};
		});

		const { plugin, registered, filesByPath } = createPlugin({ contentsByPath: { "notes/a.md": "hello" } });
		registerFileMenus(plugin);

		const fileMenu = registered.find((r) => r.event === "file-menu");
		assert.ok(fileMenu);

		const menu = new Menu();
		const file = filesByPath.get("notes/a.md")!;
		fileMenu.cb(menu, file);

		const items = menu.__getItems();
		assert.equal(items.length, 1);
		assert.equal(items[0]?.title, "LLM：生成标题并重命名");

		await items[0]?.__click();

		assert.ok(filesByPath.has("notes/New Title.md"));
		assert.deepEqual(__getNotices(), ["已生成标题并重命名。"]);
	});

	it("adds a multi-select context menu item (files-menu) and runs batch rename on click", async () => {
		let i = 0;
		__setRequestUrlMock(async () => {
			i++;
			return {
				status: 200,
				text: "",
				json: { choices: [{ message: { content: i === 1 ? "Title A" : "Title B" } }] },
			};
		});

		const { plugin, registered, filesByPath } = createPlugin({
			contentsByPath: { "a.md": "a", "b.md": "b" },
		});
		registerFileMenus(plugin);

		const filesMenu = registered.find((r) => r.event === "files-menu");
		assert.ok(filesMenu);

		const menu = new Menu();
		filesMenu.cb(menu, [filesByPath.get("a.md")!, filesByPath.get("b.md")!]);

		const items = menu.__getItems();
		assert.equal(items.length, 1);
		assert.equal(items[0]?.title, "LLM：批量生成标题并重命名");

		await items[0]?.__click();

		assert.ok(filesByPath.has("Title A.md"));
		assert.ok(filesByPath.has("Title B.md"));
		assert.match(__getNotices().join("\n"), /批量完成：重命名 2，跳过 0，失败 0/);
	});

	it("warns when selecting a large number of markdown files (>200)", async () => {
		// Make all notes empty so the workflow skips quickly (no LLM calls).
		const contentsByPath: Record<string, string> = {};
		const files: TFile[] = [];
		for (let i = 0; i < 201; i++) {
			const p = `n/${i}.md`;
			contentsByPath[p] = "";
			files.push(new TFile(p));
		}

		const { plugin, registered } = createPlugin({ contentsByPath });
		registerFileMenus(plugin);

		const filesMenu = registered.find((r) => r.event === "files-menu");
		assert.ok(filesMenu);

		const menu = new Menu();
		filesMenu.cb(menu, files);

		const items = menu.__getItems();
		await items[0]?.__click();

		const notices = __getNotices();
		assert.match(notices[0] ?? "", /已选中 201 个文件/);
	});
});
