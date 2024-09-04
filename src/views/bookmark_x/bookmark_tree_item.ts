import {
  TreeItem,
  TreeItemCollapsibleState,
  WorkspaceFolder,
  workspace,
} from "vscode";
import {
  Bookmark,
  GroupBookmark,
  BaseFunctional,
  NodeType,
} from "./functional_types";
import { Group } from "./functional_types";
import { Controller } from "./controller";
import * as util from "./util";
import {
  ICON_ACTIVE_GROUP,
  ICON_BOOKMARK,
  ICON_GROUP,
  ITEM_TYPE_BM,
  ITEM_TYPE_GROUP,
  ITEM_TYPE_GROUPBM,
  TREEVIEW_ITEM_CTX_TYPE_BM,
  TREEVIEW_ITEM_CTX_TYPE_GROUP,
  TREEVIEW_ITEM_CTX_TYPE_GROUPBM,
} from "./constants";
import { DecorationFactory } from "./decoration_factory";

export class BookmarkTreeItemFactory {
  static createBookmark(bm: Bookmark): BookmarkTreeItem {
    let result;
    const label = typeof bm.name !== "undefined" ? bm.name : "";
    result = new BookmarkTreeItem(label, TreeItemCollapsibleState.None);
    result.contextValue = TREEVIEW_ITEM_CTX_TYPE_BM;
    result.description = bm.lineText;
    // result.iconPath = bookmark.group!.decorationSvg.path;
    result.iconPath = ICON_BOOKMARK;
    result.base = bm;
    result.tooltip = workspace.asRelativePath(bm.fsPath) + ": " + label;
    result.command = {
      title: "jump to bookmark",
      command: "bookmark_x.jumpToBookmark",
      arguments: [bm],
    };
    return result;
  }
  static getCollapseState(group: Group) {
    let wsf = Controller.get_wsf_with_node(group);
    let currActiveGroupUri = Controller.get_active_group(wsf!).get_full_uri();
    if (group.children.length > 0) {
      return group.get_full_uri() === currActiveGroupUri
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.Collapsed;
    } else {
      return TreeItemCollapsibleState.None;
    }
  }
  static _createGroup(group: Group): BookmarkTreeItem {
    let wsf = Controller.get_wsf_with_node(group);
    let currActiveGroupUri = Controller.get_active_group(wsf!).get_full_uri();
    let result = new BookmarkTreeItem(group.name, this.getCollapseState(group));
    if (
      currActiveGroupUri &&
      util.isSubUriOrEqual(group.get_full_uri(), currActiveGroupUri)
    ) {
      result.iconPath = ICON_ACTIVE_GROUP;
    } else {
      result.iconPath = ICON_GROUP;
    }
    result.base = group;
    result.tooltip = group.name;
    return result;
  }
  static createGroup(group: Group): BookmarkTreeItem {
    let result = this._createGroup(group);
    result.contextValue = TREEVIEW_ITEM_CTX_TYPE_GROUP;
    return result;
  }

  static createGroupBookmark(gbm: GroupBookmark): BookmarkTreeItem {
    let result = this._createGroup(gbm);
    result.contextValue = TREEVIEW_ITEM_CTX_TYPE_GROUPBM;
    result.description = gbm.lineText;
    result.command = {
      title: "jump to bookmark",
      command: "bookmark_x.jumpToBookmark",
      arguments: [gbm],
    };
    return result;
  }

  static createType<T extends NodeType | BaseFunctional>(
    item: T,
  ): BookmarkTreeItem {
    if (item.type === ITEM_TYPE_BM) {
      return BookmarkTreeItemFactory.createBookmark(item as Bookmark);
    } else if (item.type === ITEM_TYPE_GROUP) {
      return BookmarkTreeItemFactory.createGroup(item as Group);
    } else if (item.type === ITEM_TYPE_GROUPBM) {
      return BookmarkTreeItemFactory.createGroupBookmark(item as GroupBookmark);
    } else {
      throw new Error("fromType fail.");
    }
  }

  static fromType<T extends NodeType>(item: T): BookmarkTreeItem {
    let wsf = Controller.get_wsf_with_node(item);
    if (
      Controller.get_root_group(wsf!).vicache.check_uri_exists(
        item.get_full_uri(),
      )
    ) {
      console.log("item from bm using cache");
      return Controller.get_root_group(wsf!).vicache.get(item.get_full_uri());
    } else {
      console.log("unexpected from type");
      // 不会走到这里
      return this.createType(item);
    }
  }
}
export class BookmarkTreeItem extends TreeItem {
  public base: NodeType | null = null;

  public getBaseBookmark(): Bookmark | null {
    if (this.base instanceof Bookmark) {
      return this.base;
    }
    return null;
  }

  public getBaseGroup(): Group | null {
    if (this.base instanceof Group) {
      return this.base;
    }
    return null;
  }

  public getBaseFSPath(): string | null {
    if (typeof this.base === "string") {
      return this.base;
    }
    return null;
  }
}

export class WsfTreeItem extends TreeItem {
  public wsf: WorkspaceFolder;

  constructor(wsf: WorkspaceFolder) {
    super(wsf.name, TreeItemCollapsibleState.Expanded);
    this.wsf = wsf;
    this.description = wsf.uri.path;
    this.iconPath = DecorationFactory.wsf_icon;
  }
}
