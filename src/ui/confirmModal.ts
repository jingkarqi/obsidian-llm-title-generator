import { App, Modal, Setting } from "obsidian";

export class ConfirmModal extends Modal {
	private resolve!: (value: boolean) => void;
	private readonly titleText: string;
	private readonly messageText: string;
	private readonly confirmText: string;
	private readonly cancelText: string;

	constructor(
		app: App,
		options: {
			title: string;
			message: string;
			confirmText?: string;
			cancelText?: string;
		},
	) {
		super(app);
		this.titleText = options.title;
		this.messageText = options.message;
		this.confirmText = options.confirmText ?? "继续";
		this.cancelText = options.cancelText ?? "取消";
	}

	onOpen() {
		this.titleEl.setText(this.titleText);
		this.contentEl.empty();

		this.contentEl.createEl("p", { text: this.messageText });

		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(this.cancelText)
					.setCta()
					.onClick(() => {
						this.resolve(false);
						this.close();
					}),
			)
			.addButton((btn) =>
				btn.setButtonText(this.confirmText).onClick(() => {
					this.resolve(true);
					this.close();
				}),
			);
	}

	onClose() {
		this.contentEl.empty();
	}

	waitForClose() {
		return new Promise<boolean>((resolve) => {
			this.resolve = resolve;
		});
	}
}

export async function confirm(app: App, options: ConstructorParameters<typeof ConfirmModal>[1]) {
	const modal = new ConfirmModal(app, options);
	modal.open();
	return await modal.waitForClose();
}

