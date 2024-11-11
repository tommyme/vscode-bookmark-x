import * as vscode from "vscode";
import { ViewBadge } from "vscode";
import { Controller, SpaceMap } from "./controller";
import { BookmarkTreeItem } from "./bookmark_tree_item";
import * as commonUtil from "../utils/util";
import * as bmutil from "./util";
import { ICON_GROUP, typeIsGroupLike } from "./constants";
import { BmxTreeItem } from "./bookmark_tree_data_provider";
import { ctxFixing, ctxSortItem } from "./ctx";

class MyViewBadge implements ViewBadge {
  tooltip: string;
  value: number;
  public constructor(value: number = 0) {
    this.value = value;
    this.tooltip = `${this.value} bookmarks`;
  }
}

class IconManager {
  static deactivateResetGroupIcon(tvi: BookmarkTreeItem) {
    if (typeIsGroupLike(tvi.base!.type)) {
      tvi.iconPath = ICON_GROUP;
    }
    return;
  }

  /**
   * @param {BookmarkTreeItem} tvi - a tree view item
   * @returns {boolean} whether the tvi is using activaed icon
   */
  static tviIconIsActive(tvi: BookmarkTreeItem): boolean {
    if (typeIsGroupLike(tvi.base!.type)) {
      let { ag } = Controller.get_props(tvi.base!);
      return bmutil.isSubUriOrEqual(
        tvi.base!.get_full_uri(),
        ag.get_full_uri(),
      );
    }
    return false;
  }
}

export class TVMsgManager {
  static msg: string = `∠( ᐛ 」∠)_`;
  static setMsgBug() {
    this.setMsg(`${bmutil.Gitmoji.bug} It's a bug`);
  }
  static setMsgFix() {
    this.setMsg(`${bmutil.Gitmoji.fix} Fix needed`);
  }
  static setMsgInit() {
    this.setMsg(`∠( ᐛ 」∠)_`);
  }
  static setMsgEmpty() {
    this.setMsg(`${bmutil.Gitmoji.dialog} Bookmark Empty`);
  }
  static setMsgSort() {
    this.setMsg(`${bmutil.Gitmoji.sort} sorting`);
  }
  static setMsg(msg: string | null = null) {
    if (msg !== null) {
      this.msg = msg;
    }
    BookmarkTreeViewManager.view.message = this.msg;
  }
}

export class BookmarkTreeViewManager {
  static view: vscode.TreeView<BmxTreeItem>;

  static refreshCallback() {
    if (Controller.tprovider !== null) {
      Controller.tprovider.refresh();
    }
    this.refreshBadge();
  }

  static async init() {
    // this.treeDataProviderByFile = Controller.getTreeDataProviderByFile();
    // vscode.TreeViewOptions
    if (!this.view) {
      let view = vscode.window.createTreeView<BmxTreeItem>("bookmarksByGroup", {
        treeDataProvider: Controller.tprovider,
        dragAndDropController: Controller.tprovider,
        showCollapseAll: true,
        canSelectMany: true,
      });
      view.description = "manage your bookmarks";
      this.view = view;
    }
  }
  static refreshBadge() {
    let num = 0;
    SpaceMap.rgs.forEach((rg) => {
      num += rg.cache.bookmark_num();
    });
    this.view.badge = new MyViewBadge(num);
  }

  static activateGroup(treeItem: BookmarkTreeItem) {
    const group = treeItem.getBaseGroup();
    let { wsf, rg, ag } = Controller.get_props(group!);
    if (group === null || ag.get_full_uri() === group.get_full_uri()) {
      // switch to root group, reset icon status
      Controller.activateGroup("", wsf!);
      vscode.window.showInformationMessage(`switch to root group`);
      rg.vicache.keys().forEach((key) => {
        let tvi = rg.vicache.get(key);
        IconManager.deactivateResetGroupIcon(tvi);
      });
    } else {
      Controller.activateGroup(group.get_full_uri(), wsf!);
      vscode.window.showInformationMessage(`switch to ${group.get_full_uri()}`);
      Controller.get_root_group(wsf!).vicache.refresh_active_icon_status(
        group!.get_full_uri(),
      );
    }
  }

  static deleteGroup(treeItem: BookmarkTreeItem) {
    const group = treeItem.getBaseGroup();
    Controller.safeDeleteGroups(group!).then((res) => {
      if (res) {
        vscode.window.showInformationMessage(
          `delete ${group!.get_full_uri()} successfully`,
        );
      } else {
        vscode.window.showInformationMessage(`didn't delete`);
      }
    });
  }

  static deleteBookmark(treeItem: BookmarkTreeItem) {
    const bookmark = treeItem.getBaseBookmark();
    Controller.deleteBookmark(bookmark!);
  }

  static addSubGroup(treeItem: BookmarkTreeItem) {
    const group = treeItem.getBaseGroup()!;
    Controller.inputBoxGetName().then((name: string) => {
      let uri = bmutil.joinTreeUri([group.get_full_uri(), name]);
      let wsf = Controller.get_wsf_with_node(group);
      Controller.addGroup(uri, wsf!);
    });
  }

  static editNodeLabel(treeItem: BookmarkTreeItem) {
    const node = treeItem.base;
    if (node) {
      Controller.inputBoxGetName(node.name).then((label) => {
        if (label === node.name) {
          vscode.window.showInformationMessage("edit info: label unchanged");
          return;
        } else if (!Controller.editNodeLabel(node, label)) {
          vscode.window.showInformationMessage("edit fail: label exists!");
          return;
        }
        Controller.updateDecorations();
      });
    } else {
      vscode.window.showInformationMessage("node is null");
    }
  }

  static async selectActiveGroup() {
    let wsf = commonUtil.getWsfWithActiveEditor();
    let cache = Controller.get_root_group(wsf!).cache;
    let selectedGroupName: string | undefined =
      await vscode.window.showQuickPick(
        (() => {
          let options = ["root group"];
          for (const element of cache.keys().slice(1)) {
            if (typeIsGroupLike(cache.get(element).type)) {
              options.push(element);
            }
          }
          return options;
        })(),
        { placeHolder: "Select Active Group", canPickMany: false },
      );

    if (selectedGroupName === undefined) {
      vscode.window.showInformationMessage(
        "active group selection fail: undefined error!",
      );
      return;
    }

    if (selectedGroupName === "root group") {
      selectedGroupName = "";
      vscode.window.showInformationMessage(`switch to root group`);
    } else {
      vscode.window.showInformationMessage(`switch to ` + selectedGroupName);
    }
    Controller.activateGroup(selectedGroupName, wsf!);
    Controller.get_root_group(wsf!).vicache.refresh_active_icon_status(
      selectedGroupName,
    );
    return;
  }
}
