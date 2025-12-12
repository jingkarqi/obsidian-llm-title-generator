export function stripFrontmatter(noteText: string) {
	const trimmed = noteText.startsWith("\uFEFF") ? noteText.slice(1) : noteText;
	if (!trimmed.startsWith("---")) return noteText;

	const lines = trimmed.split(/\r?\n/);
	if (lines.length < 3) return noteText;
	if (lines[0].trim() !== "---") return noteText;

	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === "---") {
			return lines.slice(i + 1).join("\n");
		}
	}

	return noteText;
}

export function takeFirstCharsByCodePoints(input: string, maxChars: number) {
	if (maxChars <= 0) return "";
	const cps = Array.from(input);
	if (cps.length <= maxChars) return input;
	return cps.slice(0, maxChars).join("");
}

