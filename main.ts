import { promises } from 'dns';
import { read } from 'fs';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, CachedMetadata } from 'obsidian';
import * as process from 'lib/event_check';
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class AutoTagPlugin extends Plugin {
	settings: MyPluginSettings;
	inModifing: boolean = false; // This is used to avoid recursive triggering the event

	async onload() {
		await this.loadSettings();
		console.log("onload")

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		this.addRibbonIcon('dice', 'Greet', () => {
			console.log('Loading plugin...');
			this.app.workspace.onLayoutReady(async () => {
				if (this.inModifing == true) {
					return
				}
				this.inModifing = true
				await process.processAllFiles(this);
				this.inModifing = false
				return
			});
		});

		this.registerEvent(this.app.vault.on('rename', (file: TFile, oldPath: string) => {
			if (this.inModifing == true) {
				return
			}
			this.inModifing = true
			process.onFileMoved(this, file, oldPath)
			this.inModifing = false
			return
		}))
		this.registerEvent(
			this.app.vault.on('modify', async (file: TFile) => {
				if (this.inModifing == true) {
					return
				}
				this.inModifing = true
				await process.onMetadataChanged(this, file);
				this.inModifing = false
				return
			})
		);

	}


	onunload() {
		console.log("onunload")
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}




}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: AutoTagPlugin;

	constructor(app: App, plugin: AutoTagPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
