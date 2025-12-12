import "../../setup";

import { describe, it, mock } from "../../harness";
import * as assert from "node:assert/strict";

import { __setRequestUrlMock } from "../../__mocks__/obsidian";
import { createChatCompletion, type ChatMessage } from "../../../src/services/llm/openaiChatCompletions";
import { DEFAULT_SETTINGS, type LlmTitleGeneratorSettings } from "../../../src/settings";

function settings(overrides: Partial<LlmTitleGeneratorSettings> = {}): LlmTitleGeneratorSettings {
	return {
		...DEFAULT_SETTINGS,
		apiKey: "sk-test",
		baseUrl: "https://example.com/v1/",
		model: "gpt-test",
		requestTimeoutMs: 1000,
		...overrides,
	};
}

describe("services/llm/openaiChatCompletions", () => {
	it("builds a POST request to /chat/completions and returns message content", async () => {
		const requestSpy = mock.fn(async () => {
			return {
				status: 200,
				text: "",
				json: {
					choices: [{ message: { content: "Hello title" } }],
				},
			};
		});
		__setRequestUrlMock(requestSpy);

		const messages: ChatMessage[] = [{ role: "user", content: "hi" }];
		const result = await createChatCompletion(settings(), messages);

		assert.equal(result, "Hello title");
		assert.equal(requestSpy.mock.callCount(), 1);

		const call = requestSpy.mock.calls[0]?.arguments?.[0] as any;
		assert.equal(call.url, "https://example.com/v1/chat/completions");
		assert.equal(call.method, "POST");
		assert.equal(call.headers.Authorization, "Bearer sk-test");
		assert.equal(call.headers["Content-Type"], "application/json");

		const body = JSON.parse(call.body);
		assert.equal(body.model, "gpt-test");
		assert.equal(body.temperature, 0.2);
		assert.equal(body.max_tokens, 64);
		assert.deepEqual(body.messages, messages);
	});

	it("supports parsing JSON from response.text when response.json is missing", async () => {
		__setRequestUrlMock(async () => {
			return {
				status: 200,
				text: JSON.stringify({ choices: [{ message: { content: "From text" } }] }),
			};
		});

		const result = await createChatCompletion(settings({ baseUrl: "https://example.com/v1" }), [
			{ role: "user", content: "hi" },
		]);
		assert.equal(result, "From text");
	});

	it("throws on missing required settings", async () => {
		await assert.rejects(() => createChatCompletion(settings({ apiKey: "" }), []), /Missing API key/i);
		await assert.rejects(() => createChatCompletion(settings({ baseUrl: "" }), []), /Missing baseUrl/i);
		await assert.rejects(() => createChatCompletion(settings({ model: "" }), []), /Missing model/i);
	});

	it("throws with status + response snippet on HTTP errors", async () => {
		__setRequestUrlMock(async () => {
			return { status: 401, text: "nope nope nope" };
		});

		await assert.rejects(
			() => createChatCompletion(settings(), [{ role: "user", content: "hi" }]),
			/HTTP 401/i,
		);
	});

	it("throws on invalid response shape", async () => {
		__setRequestUrlMock(async () => ({ status: 200, text: JSON.stringify({ hello: "world" }) }));
		await assert.rejects(
			() => createChatCompletion(settings(), [{ role: "user", content: "hi" }]),
			/Invalid response/i,
		);
	});

	it("times out when request exceeds requestTimeoutMs", async () => {
		__setRequestUrlMock(async () => {
			return await new Promise((_resolve) => {
				// Intentionally never resolves: timeout path should win.
			});
		});

		await assert.rejects(
			() => createChatCompletion(settings({ requestTimeoutMs: 10 }), [{ role: "user", content: "hi" }]),
			/timed out/i,
		);
	});
});
