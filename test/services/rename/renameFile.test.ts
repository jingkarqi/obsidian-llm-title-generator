import "../../setup";

import { describe, it, mock } from "../../harness";
import * as assert from "node:assert/strict";

import { TFile } from "../../__mocks__/obsidian";
import { renameFileWithConflictResolution } from "../../../src/services/rename/renameFile";

describe("services/rename/renameFileWithConflictResolution", () => {
	it("renames to a candidate path when there is no conflict", async () => {
		const file = new TFile("folder/Old.md");
		const existing = new Map<string, unknown>();

		const plugin: any = {
			app: {
				vault: {
					getAbstractFileByPath: (path: string) => existing.get(path) ?? null,
				},
				fileManager: {
					renameFile: mock.fn(async (f: TFile, newPath: string) => {
						existing.delete(f.path);
						f.path = newPath;
						existing.set(newPath, new TFile(newPath));
					}),
				},
			},
		};

		const renamed = await renameFileWithConflictResolution(plugin, file as any, "New Title");

		assert.deepEqual(plugin.app.fileManager.renameFile.mock.calls[0]?.arguments, [
			file,
			"folder/New Title.md",
		]);
		assert.ok(renamed instanceof TFile);
		assert.equal((renamed as TFile).path, "folder/New Title.md");
	});

	it("adds a numeric suffix when the candidate path already exists", async () => {
		const file = new TFile("Old.md");
		const existing = new Map<string, unknown>();
		existing.set("New.md", new TFile("New.md"));

		const plugin: any = {
			app: {
				vault: {
					getAbstractFileByPath: (path: string) => existing.get(path) ?? null,
				},
				fileManager: {
					renameFile: mock.fn(async (f: TFile, newPath: string) => {
						f.path = newPath;
						existing.set(newPath, new TFile(newPath));
					}),
				},
			},
		};

		const renamed = await renameFileWithConflictResolution(plugin, file as any, "New");

		assert.deepEqual(plugin.app.fileManager.renameFile.mock.calls[0]?.arguments, [file, "New (2).md"]);
		assert.equal((renamed as TFile).path, "New (2).md");
	});

	it("returns original file without renaming when unique path equals current path", async () => {
		const file = new TFile("Same.md");
		const plugin: any = {
			app: {
				vault: { getAbstractFileByPath: () => null },
				fileManager: { renameFile: mock.fn() },
			},
		};

		const result = await renameFileWithConflictResolution(plugin, file as any, "Same");
		assert.equal(result, file);
		assert.equal(plugin.app.fileManager.renameFile.mock.callCount(), 0);
	});
});
