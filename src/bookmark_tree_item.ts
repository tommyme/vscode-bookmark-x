import {ThemeColor, ThemeIcon, TreeItem, TreeItemCheckboxState, TreeItemCollapsibleState, Uri as string, workspace} from 'vscode';
import { Bookmark } from "./functional_types";
import {Group} from './functional_types';
import { Controller } from './controller';
import * as util from './util';

export class BookmarkTreeItemFactory {
    static controller: Controller;

    static createBookmark(bm: Bookmark): BookmarkTreeItem {
        let result;
        const label = (typeof bm.name !== 'undefined' ? bm.name : '');
        result = new BookmarkTreeItem(label, TreeItemCollapsibleState.None);
        result.contextValue = 'bookmark';
        result.description = bm.lineText;
        // result.iconPath = bookmark.group!.decorationSvg.path;
        result.iconPath = new ThemeIcon("bookmark");
        result.base = bm;
        result.tooltip = workspace.asRelativePath(bm.fsPath) + ': ' + label;
        result.command = {
            "title": "jump to bookmark",
            "command": "bookmark_x.jumpToBookmark",
            "arguments": [bm.get_full_uri()]
        };
        return result;
    }

    static createGroup(group: Group): BookmarkTreeItem {
        let currActiveGroupUri = this.controller.activeGroup.get_full_uri();
        const label = group.name;
        const get_collapse_state = () => {
            if (group.children.length > 0) {
                return (group.get_full_uri() === currActiveGroupUri) ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
            } else {
                return TreeItemCollapsibleState.None;
            }
        };
        let result = new BookmarkTreeItem(label, get_collapse_state());
        result.contextValue = 'group';
        if (currActiveGroupUri && util.isSubUriOrEqual(group.get_full_uri(), currActiveGroupUri)) {
            result.iconPath = new ThemeIcon("folder-opened", new ThemeColor("statusBarItem.remoteBackground"));
        } else {
            result.iconPath = new ThemeIcon("folder");
        }
        result.base = group;
        result.tooltip = group.name;
        // result.checkboxState = TreeItemCheckboxState.Unchecked
        // this.controller.view_item_map.set(group.get_full_uri(), result);
        return result;
    }

    static fromBookmark(bookmark: Bookmark): BookmarkTreeItem {
        if (this.controller.view_item_map.check_uri_exists(bookmark.get_full_uri())) {
            console.log("tree view item from bm using cache")
            return this.controller.view_item_map.get(bookmark.get_full_uri());
        } else {
            console.log("unexpected from bookmark");
            return BookmarkTreeItemFactory.createBookmark(bookmark);
        }
    }

    static fromGroup(group: Group): BookmarkTreeItem {
        if (this.controller.view_item_map.check_uri_exists(group.get_full_uri())) {
            console.log("tree view item from group using cache")
            return this.controller.view_item_map.get(group.get_full_uri());
        } else {
            console.log("unexpected from group")
            return BookmarkTreeItemFactory.createGroup(group);
        }
    }
}
export class BookmarkTreeItem extends TreeItem {
    public base: Bookmark | Group | null = null;

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
        if (typeof this.base === 'string') {
            return this.base;
        }
        return null;
    }
}
