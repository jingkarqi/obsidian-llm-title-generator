import "../../setup";

import { describe, it } from "../../harness";
import * as assert from "node:assert/strict";

import {
	extractTitleFromModelText,
	sanitizeForFilenameBasename,
} from "../../../src/services/title/titleSanitizer";

describe("services/title/titleSanitizer", () => {
	describe("extractTitleFromModelText", () => {
		it("takes the first non-empty line", () => {
			assert.equal(extractTitleFromModelText("\n\nHello\nWorld"), "Hello");
		});

		it("strips common Title/标题 prefixes", () => {
			assert.equal(extractTitleFromModelText("Title: Hello World"), "Hello World");
			assert.equal(extractTitleFromModelText("标题：你好世界"), "你好世界");
		});

		it("strips wrapping quotes/brackets once", () => {
			assert.equal(extractTitleFromModelText('"Hello"'), "Hello");
			assert.equal(extractTitleFromModelText("《你好》"), "你好");
			assert.equal(extractTitleFromModelText("“Hello”"), "Hello");
			assert.equal(extractTitleFromModelText("（Hello）"), "Hello");
		});
	});

	describe("sanitizeForFilenameBasename", () => {
		it("removes control characters", () => {
			assert.equal(sanitizeForFilenameBasename("A\u0000B\u001fC", 50), "ABC");
		});

		it("replaces filename-illegal characters and collapses whitespace", () => {
			assert.equal(
				sanitizeForFilenameBasename("Hello:/\\World  \n  Test", 200),
				"Hello World Test",
			);
		});

		it("removes trailing dots/spaces (Windows rules)", () => {
			assert.equal(sanitizeForFilenameBasename("Hello.  ", 50), "Hello");
		});

		it("falls back to Untitled if empty after sanitization", () => {
			assert.equal(sanitizeForFilenameBasename("   ", 50), "Untitled");
			assert.equal(sanitizeForFilenameBasename("////", 50), "Untitled");
		});

		it("truncates by Unicode code points", () => {
			assert.equal(sanitizeForFilenameBasename("ab😀cd", 3), "ab😀");
		});

		it("prefixes Windows reserved device names", () => {
			assert.equal(sanitizeForFilenameBasename("con", 50), "_con");
			assert.equal(sanitizeForFilenameBasename("COM1", 50), "_COM1");
		});
	});
});
