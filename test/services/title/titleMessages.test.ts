import "../../setup";

import { describe, it } from "../../harness";
import * as assert from "node:assert/strict";

import { DEFAULT_SETTINGS, type LlmTitleGeneratorSettings } from "../../../src/settings";
import { buildTitleMessages } from "../../../src/services/title/titleMessages";

describe("services/title/titleMessages", () => {
	it("builds system + user messages including snippet boundaries and maxTitleChars", () => {
		const settings: LlmTitleGeneratorSettings = {
			...DEFAULT_SETTINGS,
			apiKey: "sk-test",
			baseUrl: "https://example.com/v1",
			model: "gpt-test",
			maxTitleChars: 42,
		};

		const snippet = "# Hello\nThis is a note.";
		const messages = buildTitleMessages(snippet, settings);

		assert.equal(messages.length, 2);
		assert.equal(messages[0]?.role, "system");
		assert.equal(messages[1]?.role, "user");

		assert.ok(messages[1]?.content.includes("----- BEGIN NOTE -----"));
		assert.ok(messages[1]?.content.includes(snippet));
		assert.ok(messages[1]?.content.includes("----- END NOTE -----"));
		assert.ok(messages[1]?.content.includes("不超过 42 个字符"));
	});

	it("supports user-provided templates with placeholders", () => {
		const settings: LlmTitleGeneratorSettings = {
			...DEFAULT_SETTINGS,
			maxTitleChars: 10,
			systemPrompt: "SYS {{maxTitleChars}}",
			userPromptTemplate: "USER {{noteSnippet}}",
		};

		const messages = buildTitleMessages("hello", settings);
		assert.equal(messages[0]?.content, "SYS 10");
		assert.equal(messages[1]?.content, "USER hello");
	});

	it("appends snippet block when userPromptTemplate has no {{noteSnippet}}", () => {
		const settings: LlmTitleGeneratorSettings = {
			...DEFAULT_SETTINGS,
			userPromptTemplate: "Just instructions.",
		};

		const snippet = "abc";
		const messages = buildTitleMessages(snippet, settings);
		assert.ok(messages[1]?.content.startsWith("Just instructions."));
		assert.ok(messages[1]?.content.includes("----- BEGIN NOTE -----"));
		assert.ok(messages[1]?.content.includes("abc"));
	});
});
