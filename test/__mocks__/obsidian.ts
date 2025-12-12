export type RequestUrlOptions = {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string;
};

export type RequestUrlResponse = {
	status: number;
	text: string;
	json?: unknown;
};

type RequestUrlImpl = (options: RequestUrlOptions) => Promise<RequestUrlResponse>;

let requestUrlImpl: RequestUrlImpl | null = null;

export function __setRequestUrlMock(impl: RequestUrlImpl) {
	requestUrlImpl = impl;
}

export function __resetRequestUrlMock() {
	requestUrlImpl = null;
}

export async function requestUrl(options: RequestUrlOptions): Promise<RequestUrlResponse> {
	if (!requestUrlImpl) {
		throw new Error("requestUrl mock not set. Use __setRequestUrlMock in tests.");
	}
	return await requestUrlImpl(options);
}

export function normalizePath(input: string) {
	return (
		input
			.replace(/\\/g, "/")
			// Collapse multiple slashes (but keep leading "//" if any)
			.replace(/(^|[^:])\/{2,}/g, "$1/")
			.replace(/^\.\//, "")
	);
}

export class TAbstractFile {
	path: string;

	constructor(path: string) {
		this.path = normalizePath(path);
	}
}

export class TFile extends TAbstractFile {
	extension: string;
	basename: string;
	parent: { path: string } | null;

	constructor(path: string) {
		super(path);
		const normalized = this.path;
		const parts = normalized.split("/");
		const name = parts[parts.length - 1] ?? "";
		const lastDot = name.lastIndexOf(".");
		this.extension = lastDot >= 0 ? name.slice(lastDot + 1) : "";
		this.basename = lastDot >= 0 ? name.slice(0, lastDot) : name;
		this.parent = parts.length > 1 ? { path: parts.slice(0, -1).join("/") } : null;
	}
}

const noticeMessages: string[] = [];

export function __getNotices() {
	return [...noticeMessages];
}

export function __clearNotices() {
	noticeMessages.length = 0;
}

export class Notice {
	message: string;

	constructor(message: string) {
		this.message = message;
		noticeMessages.push(message);
	}
}

export class Menu {
	private readonly items: MenuItem[] = [];

	addItem(cb: (item: MenuItem) => void) {
		const item = new MenuItem();
		cb(item);
		this.items.push(item);
		return item;
	}

	__getItems() {
		return [...this.items];
	}
}

export class MenuItem {
	title = "";
	icon = "";
	private clickHandler: (() => void | Promise<void>) | null = null;

	setTitle(title: string) {
		this.title = title;
		return this;
	}

	setIcon(icon: string) {
		this.icon = icon;
		return this;
	}

	onClick(cb: () => void | Promise<void>) {
		this.clickHandler = cb;
		return this;
	}

	async __click() {
		await this.clickHandler?.();
	}
}

class ElementStub {
	tag: string;
	text = "";
	children: ElementStub[] = [];

	// Used by <progress> in BatchProgressModal.
	max?: number;
	value?: number;

	constructor(tag: string, options?: { text?: string }) {
		this.tag = tag;
		this.text = options?.text ?? "";
	}

	setText(text: string) {
		this.text = text;
	}

	empty() {
		this.children = [];
	}

	createEl(tag: string, options?: { text?: string }) {
		const el = new ElementStub(tag, options);
		this.children.push(el);
		return el;
	}

	createDiv() {
		return this.createEl("div");
	}
}

// Minimal stubs for other Obsidian symbols imported by the source.
export class Plugin {}
export class App {}

export class Modal {
	app: App;
	titleEl = new ElementStub("h1");
	contentEl = new ElementStub("div");

	constructor(app: App) {
		this.app = app;
	}

	open() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this as any).onOpen?.();
	}

	close() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this as any).onClose?.();
	}
}

class ButtonStub {
	private clickHandler: (() => void) | null = null;

	setButtonText() {
		return this;
	}

	setCta() {
		return this;
	}

	onClick(cb: () => void) {
		this.clickHandler = cb;
		return this;
	}

	__click() {
		this.clickHandler?.();
	}
}

export class Setting {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(_containerEl: any) {}

	setName() {
		return this;
	}

	setDesc() {
		return this;
	}

	addText(_cb: (text: any) => void) {
		return this;
	}

	addToggle(_cb: (toggle: any) => void) {
		return this;
	}

	addButton(cb: (btn: ButtonStub) => void) {
		cb(new ButtonStub());
		return this;
	}
}

export class PluginSettingTab {}
