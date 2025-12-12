import * as fs from "node:fs/promises";
import * as path from "node:path";
import { run } from "./harness";

async function collectTests(dir: string): Promise<string[]> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			// Skip helper folders/files.
			if (entry.name === "__mocks__") continue;
			files.push(...(await collectTests(fullPath)));
			continue;
		}

		if (entry.isFile() && entry.name.endsWith(".test.js")) {
			files.push(fullPath);
		}
	}

	return files;
}

async function main() {
	// eslint-disable-next-line no-undef
	const testRoot = __dirname;
	const testFiles = (await collectTests(testRoot)).sort((a, b) => a.localeCompare(b));
	for (const file of testFiles) {
		// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
		require(file);
	}
	await run();
}

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err);
	process.exitCode = 1;
});
