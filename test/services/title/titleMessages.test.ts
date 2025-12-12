import "../../setup";

import { describe, it } from "../../harness";
import * as assert from "node:assert/strict";

import type { LlmTitleGeneratorSettings } from "../../../src/settings";
import { buildTitleMessages } from "../../../src/services/title/titleMessages";

describe("services/title/titleMessages", () => {
	it("builds system + user messages including snippet boundaries and maxTitleChars", () => {
		const settings: LlmTitleGeneratorSettings = {
			apiKey: "sk-test",
			baseUrl: "https://example.com/v1",
			model: "gpt-test",
			maxInputChars: 3000,
			maxTitleChars: 42,
			temperature: 0.2,
			maxTokens: 64,
			confirmBeforeSend: true,
			confirmBeforeBatch: true,
			vaultBatchLimit: 0,
			delayMsBetweenRequests: 0,
			requestTimeoutMs: 60_000,
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
});
