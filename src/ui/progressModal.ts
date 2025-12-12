import { App, Modal, Setting } from "obsidian";

export class BatchProgressModal extends Modal {
	private cancelled = false;
	private statusEl!: HTMLParagraphElement;
	private progressEl!: HTMLProgressElement;
	private summaryEl!: HTMLDivElement;

	constructor(app: App, private readonly total: number) {
		super(app);
	}

	onOpen() {
		this.titleEl.setText("正在批量生成标题并重命名…");
		this.contentEl.empty();

		this.statusEl = this.contentEl.createEl("p", { text: `0 / ${this.total}` });

		this.progressEl = this.contentEl.createEl("progress");
		this.progressEl.max = this.total;
		this.progressEl.value = 0;

		this.summaryEl = this.contentEl.createDiv();

		new Setting(this.contentEl).addButton((btn) =>
			btn.setButtonText("取消").setCta().onClick(() => {
				this.cancelled = true;
			}),
		);
	}

	onClose() {
		this.contentEl.empty();
	}

	isCancelled() {
		return this.cancelled;
	}

	update(current: number, message: string) {
		this.statusEl.setText(`${current} / ${this.total} — ${message}`);
		this.progressEl.value = current;
	}

	setSummary(lines: string[]) {
		this.summaryEl.empty();
		for (const line of lines) {
			this.summaryEl.createEl("div", { text: line });
		}
	}
}

