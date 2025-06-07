import { App, PluginSettingTab, Setting, Modal, FuzzySuggestModal, TFile, TFolder } from "obsidian";
import { InputFilterNameModal } from "./ui/modals";
import { checkTagFilter, checkPathFilter } from "./utils";

export function addCommands(plugin) {
  plugin.addCommand({
    id: "toggle-pin-filter",
    name: "Toggle pin filter",
    callback: () => {
      new InputFilterNameModal(plugin, "PIN").open();
    }
  });
  plugin.addCommand({
    id: "toggle-global-pin-filters",
    name: "Toggle all pin filters",
    callback: () => {
      var _a;
      plugin.settings.pinFilters.active = !plugin.settings.pinFilters.active;
      plugin.saveSettings();
      (_a = plugin.getFileExplorer()) == null ? void 0 : _a.requestSort();
    }
  });
  plugin.addCommand({
    id: "reload-ignore-file",
    name: "Reload .file_folder_ignore",
    callback: () => {
      plugin.patchFileExplorer();
    }
  });
}

export function addCommandsToFileMenu(plugin) {
  plugin.registerEvent(
    plugin.app.workspace.on("file-menu", (menu, file) => {
      if (file instanceof TFile || file instanceof TFolder) {
        menu.addSeparator().addItem((item) => {
          const index = plugin.settings.pinFilters.paths.findIndex(
            (filter) => filter.patternType === "STRICT" && filter.type === "FILES" && filter.pattern === file.path
          );
          if (index === -1 || !plugin.settings.pinFilters.paths[index].active) {
            item.setTitle("Pin File").setIcon("pin").onClick(() => {
              var _a;
              if (index === -1) {
                plugin.settings.pinFilters.paths.push({
                  name: "",
                  active: true,
                  type: "FILES",
                  pattern: file.path,
                  patternType: "STRICT"
                });
              } else {
                plugin.settings.pinFilters.paths[index].active = true;
              }
              plugin.saveSettings();
              if (plugin.settings.pinFilters.active) {
                (_a = plugin.getFileExplorer()) == null ? void 0 : _a.requestSort();
              }
            });
          } else {
            item.setTitle("Unpin File").setIcon("pin-off").onClick(() => {
              var _a;
              plugin.settings.pinFilters.paths.splice(index, 1);
              plugin.saveSettings();
              (_a = plugin.getFileExplorer()) == null ? void 0 : _a.requestSort();
            });
          }
        });
      } else {
        menu.addSeparator().addItem((item) => {
          const index = plugin.settings.pinFilters.paths.findIndex(
            (filter) => filter.patternType === "STRICT" && filter.type === "DIRECTORIES" && filter.pattern === file.path
          );
          if (index === -1 || !plugin.settings.pinFilters.paths[index].active) {
            item.setTitle("Pin Folder").setIcon("pin").onClick(() => {
              var _a;
              if (index === -1) {
                plugin.settings.pinFilters.paths.push({
                  name: "",
                  active: true,
                  type: "DIRECTORIES",
                  pattern: file.path,
                  patternType: "STRICT"
                });
              } else {
                plugin.settings.pinFilters.paths[index].active = true;
              }
              plugin.saveSettings();
              if (plugin.settings.pinFilters.active) {
                (_a = plugin.getFileExplorer()) == null ? void 0 : _a.requestSort();
              }
            });
          } else {
            item.setTitle("Unpin Folder").setIcon("pin-off").onClick(() => {
              var _a;
              plugin.settings.pinFilters.paths.splice(index, 1);
              plugin.saveSettings();
              (_a = plugin.getFileExplorer()) == null ? void 0 : _a.requestSort();
            });
          }
        });
      }
    })
  );
  plugin.registerEvent(
    plugin.app.workspace.on("file-menu", (menu, file) => {
      if (file instanceof TFile || file instanceof TFolder) {
        menu.addSeparator().addItem((item) => {
          item.setTitle("Reload .file_folder_ignore")
            .setIcon("refresh-cw")
            .onClick(() => {
              plugin.patchFileExplorer();
            });
        });
      }
    })
  );
}

function addOnTagChange(plugin) {
  // ... existing code ...
}

function addOnRename(plugin) {
  // ... existing code ...
}

function addOnDelete(plugin) {
  // ... existing code ...
} 