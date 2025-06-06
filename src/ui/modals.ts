import { App, PluginSettingTab, Setting, Modal, FuzzySuggestModal, TFile, TFolder } from 'obsidian';
import { PathSuggest } from './suggest';
import { checkPathFilter, checkTagFilter, checkFrontMatterFilter, flattenObject, changeVirtualElementPin } from './utils';
import { wildcardMatch } from 'wildcard-match';
import { around } from 'monkey-around';

// src/ui/modals.ts
export class InputFilterNameModal extends FuzzySuggestModal<any> {
  plugin: any;
  actionType: "PIN"; // Only PIN action remains

  constructor(plugin: any, actionType: "PIN") {
    super(plugin.app);
    this.plugin = plugin;
    this.actionType = actionType;
    this.setPlaceholder("Type name of a pin filter..."); // Updated placeholder
  }

  getItems() {
    let filters: any[] = [];
    // Only get pin filters
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
  actionType: "PIN"; // Only PIN action remains
  specificFilter: any;
  filterType: "PATH" | "TAG" | "FRONTMATTER" | undefined;

  constructor(plugin: any, actionType: "PIN", specificFilter?: any, filterType?: "PATH" | "TAG" | "FRONTMATTER") {
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

    // Updated class name
    contentEl.addClasses(["file-folder-ignore", "filters-activated-modal"]);

    const data = [["Path", "Type", "Filters"]];
    for (const path of pathsActivated) {
      const row = [];
      if (path instanceof TFile) { // Use TFile type from Obsidian
        const link = contentEl.createEl("a");
        link.onClickEvent(() => {
          this.app.workspace.getLeaf("tab").openFile(path); // Assuming path is TFile
        });
        link.textContent = path.path;
        row.push(link);
      } else if (path instanceof TFolder) { // Use TFolder type from Obsidian
         row.push(path.path);
      } else {
         row.push(path.path); // Fallback
      }

      if (path instanceof TFile) { // Use TFile type from Obsidian
        row.push("File");
      } else if (path instanceof TFolder) { // Use TFolder type from Obsidian
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