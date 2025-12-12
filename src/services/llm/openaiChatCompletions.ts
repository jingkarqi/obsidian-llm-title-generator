import { requestUrl } from "obsidian";

import type { LlmTitleGeneratorSettings } from "../../settings";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
	role: ChatRole;
	content: string;
}

function joinUrl(baseUrl: string, path: string) {
	const base = baseUrl.replace(/\/+$/g, "");
	const p = path.replace(/^\/+/g, "");
	return `${base}/${p}`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
	if (timeoutMs <= 0) return promise;
	return await Promise.race([
		promise,
		new Promise<T>((_resolve, reject) => {
			window.setTimeout(() => reject(new Error("Request timed out.")), timeoutMs);
		}),
	]);
}

export async function createChatCompletion(
	settings: LlmTitleGeneratorSettings,
	messages: ChatMessage[],
) {
	if (!settings.apiKey) throw new Error("Missing API key.");
	if (!settings.baseUrl) throw new Error("Missing baseUrl.");
	if (!settings.model) throw new Error("Missing model.");

	const url = joinUrl(settings.baseUrl, "/chat/completions");

	const body = {
		model: settings.model,
		messages,
		temperature: settings.temperature,
		max_tokens: settings.maxTokens,
	};

	const response = await withTimeout(
		requestUrl({
			url,
			method: "POST",
			headers: {
				Authorization: `Bearer ${settings.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		}),
		settings.requestTimeoutMs,
	);

	if (response.status < 200 || response.status >= 300) {
		const details = typeof response.text === "string" ? response.text.slice(0, 500) : "";
		throw new Error(`HTTP ${response.status} ${details}`.trim());
	}

	const data: any = response.json ?? JSON.parse(response.text);
	const content =
		data?.choices?.[0]?.message?.content ??
		data?.choices?.[0]?.text ??
		data?.choices?.[0]?.delta?.content;

	if (typeof content !== "string" || !content.trim()) {
		throw new Error("Invalid response: missing choices[0].message.content.");
	}

	return content;
}
