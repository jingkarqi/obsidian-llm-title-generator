import "../setup";

import { describe, it } from "../harness";
import * as assert from "node:assert/strict";

import { stripFrontmatter, takeFirstCharsByCodePoints } from "../../src/utils/noteText";

describe("utils/noteText", () => {
	describe("stripFrontmatter", () => {
		it("returns original text when no frontmatter", () => {
			const input = "hello\nworld";
			assert.equal(stripFrontmatter(input), input);
		});

		it("strips YAML frontmatter block delimited by ---", () => {
			const input = ["---", "title: Test", "tags: [a, b]", "---", "", "# Heading"].join("\n");
			assert.equal(stripFrontmatter(input), ["", "# Heading"].join("\n"));
		});

		it("handles BOM before frontmatter", () => {
			const input = ["\uFEFF---", "a: 1", "---", "content"].join("\n");
			assert.equal(stripFrontmatter(input), "content");
		});

		it("returns original text if frontmatter is unterminated", () => {
			const input = ["---", "a: 1", "content"].join("\n");
			assert.equal(stripFrontmatter(input), input);
		});
	});

	describe("takeFirstCharsByCodePoints", () => {
		it("returns empty string for non-positive limit", () => {
			assert.equal(takeFirstCharsByCodePoints("abc", 0), "");
			assert.equal(takeFirstCharsByCodePoints("abc", -1), "");
		});

		it("does not split surrogate pairs (emoji)", () => {
			const input = "a😀b";
			assert.deepEqual(Array.from(input), ["a", "😀", "b"]);
			assert.equal(takeFirstCharsByCodePoints(input, 2), "a😀");
		});

		it("returns input when within limit", () => {
			const input = "hello";
			assert.equal(takeFirstCharsByCodePoints(input, 10), input);
		});
	});
});
