import { DEFAULT_SETTINGS, type LlmTitleGeneratorSettings } from "../../settings";
import type { ChatMessage } from "../llm/openaiChatCompletions";

const TEMPLATE_VAR = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function renderTemplate(template: string, variables: Record<string, string>) {
	return template.replace(TEMPLATE_VAR, (match, name: string) => {
		if (Object.prototype.hasOwnProperty.call(variables, name)) return variables[name] ?? "";
		return match;
	});
}

export function buildTitleMessages(
	noteSnippet: string,
	settings: LlmTitleGeneratorSettings,
): ChatMessage[] {
	const variables = {
		maxTitleChars: String(settings.maxTitleChars),
		noteSnippet,
	};

	const systemTemplate = settings.systemPrompt?.trim() || DEFAULT_SETTINGS.systemPrompt;
	const userTemplate = settings.userPromptTemplate?.trim() || DEFAULT_SETTINGS.userPromptTemplate;

	const system = renderTemplate(systemTemplate, variables).trim();
	const hasSnippetPlaceholder = userTemplate.includes("{{noteSnippet}}");
	let user = renderTemplate(userTemplate, variables);

	// Guardrail: ensure we always include content to title.
	if (!hasSnippetPlaceholder) {
		user = [
			user.trimEnd(),
			"",
			"笔记内容片段如下：",
			"----- BEGIN NOTE -----",
			noteSnippet,
			"----- END NOTE -----",
		].join("\n");
	}

	return [
		{ role: "system", content: system },
		{ role: "user", content: user },
	];
}
