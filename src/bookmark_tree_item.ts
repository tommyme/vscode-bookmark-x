import {ThemeColor, ThemeIcon, TreeItem, TreeItemCheckboxState, TreeItemCollapsibleState, Uri as string, workspace} from 'vscode';
import { Bookmark } from "./functional_types";
import {Group} from './functional_types';
import { Controller } from './controller';

export class BookmarkTreeItemFactory {
    static controller: Controller;

    static fromBookmark(bookmark: Bookmark): BookmarkTreeItem {
        const label = (typeof bookmark.name !== 'undefined' ? bookmark.name : '');
        let result: BookmarkTreeItem;
        if (this.controller.view_item_map.check_uri_exists(bookmark.get_full_uri())) {
            result = this.controller.view_item_map.get(bookmark.get_full_uri());
        } else {
            result = new BookmarkTreeItem(label, TreeItemCollapsibleState.None);
            result.contextValue = 'bookmark';
            result.description = bookmark.lineText;
            // result.iconPath = bookmark.group!.decorationSvg.path;
            result.iconPath = new ThemeIcon("bookmark");
            result.base = bookmark;
            result.tooltip = workspace.asRelativePath(bookmark.fsPath) + ': ' + label;
            result.command = {
                "title": "jump to bookmark",
                "command": "bookmark_x.jumpToBookmark",
                "arguments": [bookmark.get_full_uri()]
            };
            // result.checkboxState = TreeItemCheckboxState.Unchecked;
        }
        return result;
    }

    static fromGroup(group: Group, currActiveGroup: string): BookmarkTreeItem {
        const label = group.name;
        const get_collapse_state = () => {
            if (group.children.length > 0) {
                return currActiveGroup ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed;
            } else {
                return TreeItemCollapsibleState.None;
            }
        };
        let result: BookmarkTreeItem;
        if (this.controller.view_item_map.check_uri_exists(group.get_full_uri())) {
            result = this.controller.view_item_map.get(group.get_full_uri());
        } else {
            result = new BookmarkTreeItem(label, get_collapse_state());
            result.contextValue = 'group';
            if (currActiveGroup.startsWith(group.get_full_uri())) {
                result.iconPath = new ThemeIcon("folder-opened", new ThemeColor("statusBarItem.remoteBackground"));
            } else {
                result.iconPath = new ThemeIcon("folder");
            }
            result.base = group;
            result.tooltip = group.name;
            // result.checkboxState = TreeItemCheckboxState.Unchecked
            // this.controller.view_item_map.set(group.get_full_uri(), result);
        }
        return result;
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

class A {
    static xxx: string|undefined;
    public static fuck() {
        console.log(this.xxx);
    }
}