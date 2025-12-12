function truncateByCodePoints(input: string, maxChars: number) {
	if (maxChars <= 0) return "";
	const codePoints = Array.from(input);
	if (codePoints.length <= maxChars) return input;
	return codePoints.slice(0, maxChars).join("");
}

function stripWrappingQuotes(text: string) {
	let t = text.trim();

	// Remove common wrapping quotes/brackets once.
	const wrappers: Array<[string, string]> = [
		['"', '"'],
		["'", "'"],
		["`", "`"],
		["“", "”"],
		["‘", "’"],
		["《", "》"],
		["「", "」"],
		["『", "』"],
		["(", ")"],
		["（", "）"],
		["[", "]"],
		["【", "】"],
	];

	for (const [left, right] of wrappers) {
		if (t.startsWith(left) && t.endsWith(right) && t.length >= left.length + right.length + 1) {
			t = t.slice(left.length, t.length - right.length).trim();
			break;
		}
	}

	return t;
}

function stripTitlePrefix(text: string) {
	return text.replace(/^(title|标题)\s*[:：]\s*/i, "");
}

export function extractTitleFromModelText(raw: string) {
	const firstLine = raw.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
	let t = stripTitlePrefix(firstLine.trim());
	t = stripWrappingQuotes(t);
	return t.trim();
}

export function sanitizeForFilenameBasename(rawTitle: string, maxChars: number) {
	let t = rawTitle;

	// Remove control chars
	t = t.replace(/[\u0000-\u001f\u007f]/g, "");

	// Replace filename-illegal characters (Windows + common)
	t = t.replace(/[\\/:*?"<>|]/g, " ");

	// Collapse whitespace
	t = t.replace(/\s+/g, " ").trim();

	// Windows: trailing dot/space are invalid in filenames
	t = t.replace(/[ .]+$/g, "");

	// Avoid empty
	if (!t) t = "Untitled";

	t = truncateByCodePoints(t, maxChars);

	// Windows reserved device names
	if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(t)) {
		t = `_${t}`;
	}

	return t;
}

