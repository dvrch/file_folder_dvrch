import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { FileFolderIgnoreSettingTab } from "./settings";
import { addCommands, addCommandsToFileMenu } from "./handlers";

export default class FileFolderIgnorePlugin extends Plugin {
	async onload() {
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new FileFolderIgnoreSettingTab(this.app, this));

		// Add commands
		addCommands(this);
		addCommandsToFileMenu(this);

		// Patch file explorer to hide ignored files
		this.patchFileExplorer();
	}

	onunload() {
		// Cleanup if needed
	}

	async loadSettings() {
		// Load settings from data.json
	}

	async saveSettings() {
		// Save settings to data.json
	}

	getFileExplorerContainer() {
		return this.app.workspace.getLeavesOfType("file-explorer")[0]?.view.containerEl;
	}

	getFileExplorer() {
		return this.app.workspace.getLeavesOfType("file-explorer")[0]?.view;
	}

	patchFileExplorer() {
		const fileExplorer = this.getFileExplorer();
		if (!fileExplorer) return;

		// Patch the file explorer to hide ignored files
		const originalGetSortedFolderItems = fileExplorer.getSortedFolderItems;
		fileExplorer.getSortedFolderItems = function(folder) {
			const items = originalGetSortedFolderItems.call(this, folder);
			// Filter out ignored files/folders based on .file_folder_ignore
			return items.filter(item => {
				// TODO: Implement ignore logic based on .file_folder_ignore file
				return true;
			});
		};
	}
} 