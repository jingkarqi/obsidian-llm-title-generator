const fs = require("fs");
const path = require("path");

const ts = require("typescript");

const repoRoot = path.resolve(__dirname, "..");
const distRoot = path.join(repoRoot, "dist-test");

function writeObsidianStub() {
	const obsidianDir = path.join(distRoot, "node_modules", "obsidian");
	fs.mkdirSync(obsidianDir, { recursive: true });
	const indexJs = path.join(obsidianDir, "index.js");

	// Re-export the compiled test stub so `require("obsidian")` works in dist-test.
	const reexportPath = "../../test/__mocks__/obsidian.js";
	fs.writeFileSync(indexJs, `module.exports = require(${JSON.stringify(reexportPath)});\n`, "utf8");
}

function compile() {
	const configPath = path.join(repoRoot, "tsconfig.test.json");
	const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
	if (configFile.error) return [configFile.error];

	const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
	const program = ts.createProgram(parsed.fileNames, parsed.options);

	const diagnostics = ts.getPreEmitDiagnostics(program);
	const emitResult = program.emit();

	return diagnostics.concat(emitResult.diagnostics ?? []);
}

function hasErrors(diagnostics) {
	return diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error);
}

function printDiagnostics(diagnostics) {
	if (diagnostics.length === 0) return;
	// Color output if supported by the host.
	const formatHost = {
		getCanonicalFileName: (f) => f,
		getCurrentDirectory: ts.sys.getCurrentDirectory,
		getNewLine: () => ts.sys.newLine,
	};
	// eslint-disable-next-line no-console
	console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost));
}

async function main() {
	// Clean old output to avoid stale JS.
	fs.rmSync(distRoot, { recursive: true, force: true });

	const diagnostics = compile();
	printDiagnostics(diagnostics);
	if (hasErrors(diagnostics)) {
		process.exitCode = 1;
		return;
	}

	writeObsidianStub();

	// Run compiled tests in-process (no child_process usage).
	require(path.join(distRoot, "test", "run-tests.js"));
}

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err);
	process.exitCode = 1;
});
