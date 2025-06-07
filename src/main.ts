import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { FileFolderIgnoreSettingTab } from "./settings";
import { addCommands, addCommandsToFileMenu } from "./handlers";

const FILE_FOLDER_IGNORE_DEFAULT_SETTINGS = {
	// Define your default settings here
};

export default class FileFolderIgnorePlugin extends Plugin {
	settings: any;

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
		this.settings = Object.assign({}, FILE_FOLDER_IGNORE_DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getFileExplorerContainer() {
		return this.app.workspace.getLeavesOfType("file-explorer")[0]?.view.containerEl;
	}

	getFileExplorer() {
		return this.app.workspace.getLeavesOfType("file-explorer")[0]?.view;
	}
	patchFileExplorer() {
		const fileExplorer = this.getFileExplorer() as any;
		if (!fileExplorer) return;

		// Patch the file explorer to hide ignored files
		if (fileExplorer.getSortedFolderItems) {
			const originalGetSortedFolderItems = fileExplorer.getSortedFolderItems;
			fileExplorer.getSortedFolderItems = function(folder) {
				const items = originalGetSortedFolderItems.call(this, folder);
				// Filter out ignored files/folders based on filters
				return items.filter((item: any) => {
					// Implement filter logic
					return true;
				});
			};
		}
	}
}