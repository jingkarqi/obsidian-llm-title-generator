import { Plugin } from "obsidian";

import { registerCommands } from "./commands/registerCommands";
import { registerFileMenus } from "./commands/registerFileMenus";
import {
	DEFAULT_SETTINGS,
	LlmTitleGeneratorSettingTab,
	type LlmTitleGeneratorSettings,
} from "./settings";

export default class LlmTitleGeneratorPlugin extends Plugin {
	settings: LlmTitleGeneratorSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new LlmTitleGeneratorSettingTab(this.app, this));

		registerCommands(this);
		registerFileMenus(this);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

