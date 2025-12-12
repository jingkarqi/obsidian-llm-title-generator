import { normalizePath, TFile } from "obsidian";

import type LlmTitleGeneratorPlugin from "../../main";

function buildCandidatePath(file: TFile, newBasename: string) {
	const dir = file.parent?.path ?? "";
	const ext = file.extension || "md";
	const filename = `${newBasename}.${ext}`;
	return normalizePath(dir ? `${dir}/${filename}` : filename);
}

function buildUniquePath(plugin: LlmTitleGeneratorPlugin, candidatePath: string) {
	if (!plugin.app.vault.getAbstractFileByPath(candidatePath)) return candidatePath;

	const abstract = plugin.app.vault.getAbstractFileByPath(candidatePath);
	if (abstract instanceof TFile && abstract.path === candidatePath) {
		// exists
	}

	const extMatch = candidatePath.match(/^(.*?)(\.[^./\\]+)$/);
	const base = extMatch ? extMatch[1] : candidatePath;
	const ext = extMatch ? extMatch[2] : "";

	for (let i = 2; i < 10_000; i++) {
		const attempt = `${base} (${i})${ext}`;
		if (!plugin.app.vault.getAbstractFileByPath(attempt)) return attempt;
	}

	throw new Error("Could not find a unique file path.");
}

export async function renameFileWithConflictResolution(
	plugin: LlmTitleGeneratorPlugin,
	file: TFile,
	newBasename: string,
) {
	const candidatePath = buildCandidatePath(file, newBasename);
	const uniquePath = buildUniquePath(plugin, candidatePath);

	if (uniquePath === file.path) return file;

	await plugin.app.fileManager.renameFile(file, uniquePath);

	const renamed = plugin.app.vault.getAbstractFileByPath(uniquePath);
	if (renamed instanceof TFile) return renamed;

	// Fallback: return original reference (Obsidian usually mutates it)
	return file;
}

