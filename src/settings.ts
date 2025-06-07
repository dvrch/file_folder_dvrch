import { App, PluginSettingTab, Setting, Modal, FuzzySuggestModal } from "obsidian";
import { PathSuggest } from "./ui/suggest";
import { checkPathFilter, checkTagFilter, checkFrontMatterFilter, flattenObject, changeVirtualElementPin } from "./utils";
import { wildcardMatch } from "wildcard-match";

// src/ui/modals.ts
export class InputFilterNameModal extends FuzzySuggestModal<any> {
  plugin: any;
  actionType: "PIN" | "HIDE";

  constructor(plugin: any, actionType: "PIN" | "HIDE") {
    super(plugin.app);
    this.plugin = plugin;
    this.actionType = actionType;
    this.setPlaceholder("Type name of a filter...");
  }

  getItems() {
    let filters: any[] = [];
    if (this.actionType === "PIN") {
      filters = filters.concat(this.plugin.settings?.pinFilters.tags || []);
      filters = filters.concat(this.plugin.settings?.pinFilters.paths || []);
      filters = filters.concat(this.plugin.settings?.pinFilters.frontMatter || []);
    }
    filters = filters.filter((x) => x.name !== "");
    filters = [...new Set(filters)];
    return filters;
  }

  getItemText(filter: any): string {
    return `${filter.name} (${filter.active ? "Enabled" : "Disabled"})`;
  }

  onChooseItem(chosenFilter: any): void {
    if (this.actionType === "PIN") {
      this.plugin.settings.pinFilters.tags = this.plugin.settings.pinFilters.tags.map((filter: any) => {
        if (filter.name === chosenFilter.name) {
          filter.active = !filter.active;
        }
        return filter;
      });
      this.plugin.settings.pinFilters.paths = this.plugin.settings.pinFilters.paths.map((filter: any) => {
        if (filter.name === chosenFilter.name) {
          filter.active = !filter.active;
        }
        return filter;
      });
      this.plugin.settings.pinFilters.frontMatter = this.plugin.settings.pinFilters.frontMatter.map((filter: any) => {
        if (filter.name === chosenFilter.name) {
          filter.active = !filter.active;
        }
        return filter;
      });
    }
    this.plugin.getFileExplorer()?.requestSort();
  }
}

export class PathsActivatedModal extends Modal {
  plugin: any;
  actionType: "PIN" | "HIDE";
  specificFilter: any;
  filterType: "PATH" | "TAG" | "FRONTMATTER" | undefined;

  constructor(plugin: any, actionType: "PIN" | "HIDE", specificFilter?: any, filterType?: "PATH" | "TAG" | "FRONTMATTER") {
    super(plugin.app);
    this.plugin = plugin;
    this.actionType = actionType;
    this.specificFilter = specificFilter;
    this.filterType = filterType;
  }

  onOpen() {
    const { contentEl } = this;
    const files = this.app.vault.getAllLoadedFiles();
    let pathsActivated: any[] = [];

    // Only get pin filters
    let pathFilters = this.plugin.settings.pinFilters.paths;
    let tagFilters = this.plugin.settings.pinFilters.tags;
    let frontMatterFilters = this.plugin.settings.pinFilters.frontMatter;

    if (this.specificFilter) {
      pathsActivated = files.filter((file: any) => {
        if (this.filterType === "PATH") {
          return checkPathFilter(this.specificFilter, file);
        } else if (this.filterType === "TAG") {
          return checkTagFilter(this.specificFilter, file);
        } else if (this.filterType === "FRONTMATTER") {
          return checkFrontMatterFilter(this.specificFilter, file);
        }
        return false;
      });
    } else {
      // Only get paths to pin
      pathsActivated = this.plugin.getPathsToPin(files);
    }

    pathsActivated = pathsActivated.map((file: any) => {
      const pathFiltersActivated = pathFilters.map((filter: any) => {
        if (checkPathFilter(filter, file)) {
          if (filter.name && filter.name !== "") {
            return filter.name;
          } else {
            return filter.pattern;
          }
        }
        return undefined;
      }).filter((x) => !!x);

      const tagFiltersActivated = tagFilters.map((filter: any) => {
        if (checkTagFilter(filter, file)) {
          if (filter.name && filter.name !== "") {
            return filter.name;
          } else {
            return filter.pattern;
          }
        }
        return undefined;
      }).filter((x) => !!x);

      const frontMatterFiltersActivated = frontMatterFilters.map((filter: any) => {
        if (checkFrontMatterFilter(filter, file)) {
          if (filter.name && filter.name !== "") {
            return filter.name;
          } else {
            return filter.pattern;
          }
        }
        return undefined;
      }).filter((x) => !!x);

      file.filtersActivated = pathFiltersActivated.join(", ") + tagFiltersActivated.join(", ") + frontMatterFiltersActivated.join(", ");
      return file;
    });

    contentEl.addClasses(["file-folder-ignore", "filters-activated-modal"]);

    const data = [["Path", "Type", "Filters"]];
    for (const path of pathsActivated) {
      const row = [];
      if (path instanceof import_obsidian3.TFile) {
        const link = contentEl.createEl("a");
        link.onClickEvent(() => {
          this.app.workspace.getLeaf("tab").openFile(path);
        });
        link.textContent = path.path;
        row.push(link);
      } else {
        row.push(path.path);
      }

      if (path instanceof import_obsidian3.TFile) {
        row.push("File");
      } else if (path instanceof import_obsidian3.TFolder) {
        row.push("Folder");
      } else {
        row.push("Unknown");
      }

      row.push(path.filtersActivated);
      data.push(row);
    }

    const table = generateTable(data);
    contentEl.appendChild(table);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

function generateTable(data: any[][]): HTMLElement {
  const table = document.createElement("table", {});
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  table.appendChild(thead);
  table.appendChild(tbody);

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const tableRow = document.createElement("tr");
    if (i === 0) {
      thead.appendChild(tableRow);
    } else {
      tbody.appendChild(tableRow);
    }

    for (let j = 0; j < row.length; j++) {
      let cell;
      if (i === 0) {
        cell = document.createElement("th");
        cell.textContent = data[i][j];
      } else {
        cell = document.createElement("td");
        if (typeof data[i][j] === "string") {
          cell.textContent = data[i][j];
        } else {
          cell.appendChild(data[i][j]);
        }
      }
      tableRow.appendChild(cell);
    }
  }

  return table;
}

// src/settings.ts
const FILE_FOLDER_IGNORE_DEFAULT_SETTINGS = {
  hideStrictPathFilters: true,
  pinFilters: {
    active: true,
    tags: [
      {
        name: "",
        active: true,
        pattern: "",
        patternType: "STRICT"
      }
    ],
    paths: [
      {
        name: "",
        active: true,
        type: "FILES_AND_DIRECTORIES",
        pattern: "",
        patternType: "WILDCARD"
      }
    ],
    frontMatter: [
      {
        name: "",
        active: true,
        path: "",
        pattern: "",
        patternType: "STRICT"
      }
    ]
  },
  // Keep hideFilters structure but disable by default and empty
  hideFilters: {
    active: false,
    tags: [],
    paths: [],
    frontMatter: []
  }
};

export class FileFolderIgnoreSettingTab extends PluginSettingTab {
  plugin: FileFolderIgnorePlugin;

  constructor(app: App, plugin: FileFolderIgnorePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'File Folder Ignore Settings' });

    // Pin Filters Section
    new Setting(containerEl)
      .setName('Enable Pin Filters')
      .setDesc('Toggle whether pin filters are active')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.pinFilters.active)
        .onChange(async (value) => {
          this.plugin.settings.pinFilters.active = value;
          await this.plugin.saveSettings();
        }));

    // Hide Filters Section
    new Setting(containerEl)
      .setName('Enable Hide Filters')
      .setDesc('Toggle whether hide filters are active')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.hideFilters.active)
        .onChange(async (value) => {
          this.plugin.settings.hideFilters.active = value;
          await this.plugin.saveSettings();
        }));

    // Path Filters Section
    this.pinPathFiltersSettings(containerEl);
    this.pinTagFiltersSettings(containerEl);
    this.pinFrontMatterFiltersSettings(containerEl);
  }

  cleanSettings() {
    this.plugin.settings.pinFilters.tags = this.plugin.settings.pinFilters.tags.filter((filter: any, index: number, arr: any[]) => {
      if (index == arr.length - 1) {
        return true;
      }
      return filter.pattern !== "" && arr.findIndex((x: any) => x.pattern === filter.pattern) === index;
    });
    this.plugin.settings.pinFilters.paths = this.plugin.settings.pinFilters.paths.filter((filter: any, index: number, arr: any[]) => {
      if (index == arr.length - 1) {
        return true;
      }
      return filter.pattern !== "" && arr.findIndex((x: any) => x.pattern === filter.pattern) === index;
    });
    // Ensure hide filters remain empty
    this.plugin.settings.hideFilters.tags = [];
    this.plugin.settings.hideFilters.paths = [];
    this.plugin.settings.hideFilters.frontMatter = [];
  }

  pinTagFiltersSettings() {
    this.containerEl.createEl("h2", { text: "Tag filters" });
    this.plugin.settings.pinFilters.tags.forEach((filter: any, index: number) => {
      new Setting(this.containerEl)
        .addText((text) => {
          text.setPlaceholder("Name (optional)")
            .setValue(filter.name)
            .onChange(async (newName) => {
              this.plugin.settings.pinFilters.tags[index].name = newName;
              await this.plugin.saveSettings();
            });
        })
        .addText((text) => {
          text.setPlaceholder("Tag pattern (required)")
            .setValue(filter.pattern)
            .onChange(async (newPattern) => {
              this.plugin.settings.pinFilters.tags[index].pattern = newPattern;
              await this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addDropdown((dropdown) => {
          dropdown.addOptions({
            WILDCARD: "Wildcard",
            REGEX: "Regex",
            STRICT: "Strict",
          })
            .setValue(filter.patternType)
            .onChange(async (newPatternType: "WILDCARD" | "REGEX" | "STRICT") => {
              this.plugin.settings.pinFilters.tags[index].patternType = newPatternType;
              await this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addToggle((toggle) => {
          toggle.setTooltip("Active")
            .setValue(filter.active)
            .onChange(async (isActive) => {
              this.plugin.settings.pinFilters.tags[index].active = isActive;
              await this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addExtraButton((button) => {
          button.setIcon("calculator")
            .setTooltip("View paths pinned by this filter")
            .onClick(() => {
              new PathsActivatedModal(this.plugin, "PIN", filter, "TAG").open();
            });
        })
        .addExtraButton((button) => {
          button.setIcon("cross")
            .setTooltip("Delete")
            .onClick(async () => {
              this.plugin.settings.pinFilters.tags.splice(index, 1);
              await this.plugin.saveSettings();
              this.display();
              this.plugin.getFileExplorer()?.requestSort();
            });
        });
    });

    new Setting(this.containerEl)
      .addButton((button) => {
        button.setButtonText("Add new pin filter for tags")
          .setCta()
          .onClick(async () => {
            this.plugin.settings.pinFilters.tags.push({
              name: "",
              active: true,
              pattern: "",
              patternType: "STRICT",
            });
            await this.plugin.saveSettings();
            this.display();
          });
      });
  }

  pinPathFiltersSettings() {
    this.containerEl.createEl("h2", { text: "Path filters" });
    this.plugin.settings.pinFilters.paths.forEach((filter: any, index: number) => {
      if (this.plugin.settings.hideStrictPathFilters && filter.patternType === "STRICT") {
        return;
      }
      new Setting(this.containerEl)
        .addText((text) => {
          text.setPlaceholder("Name (optional)")
            .setValue(filter.name)
            .onChange(async (newName) => {
              this.plugin.settings.pinFilters.paths[index].name = newName;
              await this.plugin.saveSettings();
            });
        })
        .addSearch((text) => {
          new PathSuggest(this.app, text.inputEl);
          text.setPlaceholder("Path pattern (required)")
            .setValue(filter.pattern)
            .onChange(async (newPattern) => {
              this.plugin.settings.pinFilters.paths[index].pattern = newPattern;
              await this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addDropdown((dropdown) => {
          dropdown.addOptions({
            FILES_AND_DIRECTORIES: "Files and folders",
            FILES: "Files",
            DIRECTORIES: "Folders",
          })
            .setValue(filter.type)
            .onChange(async (newType: "FILES_AND_DIRECTORIES" | "FILES" | "DIRECTORIES") => {
              this.plugin.settings.pinFilters.paths[index].type = newType;
              await this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addDropdown((dropdown) => {
          dropdown.addOptions({
            WILDCARD: "Wildcard",
            REGEX: "Regex",
            STRICT: "Strict",
          })
            .setValue(filter.patternType)
            .onChange(async (newPatternType: "WILDCARD" | "REGEX" | "STRICT") => {
              this.plugin.settings.pinFilters.paths[index].patternType = newPatternType;
              await this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addToggle((toggle) => {
          toggle.setTooltip("Active")
            .setValue(filter.active)
            .onChange(async (isActive) => {
              this.plugin.settings.pinFilters.paths[index].active = isActive;
              await this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addExtraButton((button) => {
          button.setIcon("calculator")
            .setTooltip("View paths pinned by this filter")
            .onClick(() => {
              new PathsActivatedModal(this.plugin, "PIN", filter, "PATH").open();
            });
        })
        .addExtraButton((button) => {
          button.setIcon("cross")
            .setTooltip("Delete")
            .onClick(async () => {
              this.plugin.settings.pinFilters.paths.splice(index, 1);
              await this.plugin.saveSettings();
              this.display();
              this.plugin.getFileExplorer()?.requestSort();
            });
        });
    });

    new Setting(this.containerEl)
      .addButton((button) => {
        button.setButtonText("Add new pin filter for paths")
          .setCta()
          .onClick(async () => {
            this.plugin.settings.pinFilters.paths.push({
              name: "",
              active: true,
              type: "FILES_AND_DIRECTORIES",
              pattern: "",
              patternType: "WILDCARD",
            });
            await this.plugin.saveSettings();
            this.display();
          });
      });
  }

  pinFrontMatterFiltersSettings() {
    this.containerEl.createEl("h2", { text: "Front Matter filters" });
    this.plugin.settings.pinFilters.frontMatter?.forEach((filter: any, index: number) => {
      new Setting(this.containerEl)
        .addText((text) => {
          text.setPlaceholder("Name (optional)")
            .setValue(filter.name)
            .onChange(async (newName) => {
              this.plugin.settings.pinFilters.frontMatter[index].name = newName;
              await this.plugin.saveSettings();
            });
        })
        .addText((text) => {
          text.setPlaceholder("Key path (required)")
            .setValue(filter.path)
            .onChange(async (newPath) => {
              this.plugin.settings.pinFilters.frontMatter[index].path = newPath;
              await this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addText((text) => {
          text.setPlaceholder("Value pattern (required)")
            .setValue(filter.pattern)
            .onChange(async (newPattern) => {
              this.plugin.settings.pinFilters.frontMatter[index].pattern = newPattern;
              await this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addToggle((toggle) => {
          toggle.setTooltip("Active")
            .setValue(filter.active)
            .onChange(async (isActive) => {
              this.plugin.settings.pinFilters.frontMatter[index].active = isActive;
              await this.plugin.saveSettings();
              this.plugin.getFileExplorer()?.requestSort();
            });
        })
        .addExtraButton((button) => {
          button.setIcon("calculator")
            .setTooltip("View paths pinned by this filter")
            .onClick(() => {
              new PathsActivatedModal(this.plugin, "PIN", filter, "FRONTMATTER").open();
            });
        })
        .addExtraButton((button) => {
          button.setIcon("cross")
            .setTooltip("Delete")
            .onClick(async () => {
              this.plugin.settings.pinFilters.frontMatter.splice(index, 1);
              await this.plugin.saveSettings();
              this.display();
              this.plugin.getFileExplorer()?.requestSort();
            });
        });
    });

    new Setting(this.containerEl)
      .addButton((button) => {
        button.setButtonText("Add new pin filter for front matter")
          .setCta()
          .onClick(async () => {
            this.plugin.settings.pinFilters.frontMatter.push({
              name: "",
              active: true,
              path: "",
              pattern: "",
              patternType: "STRICT",
            });
            await this.plugin.saveSettings();
            this.display();
          });
      });
  }
}