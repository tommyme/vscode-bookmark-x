import {ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri as string, workspace} from 'vscode';
import { Bookmark } from "./functional_types";
import {Group} from './functional_types';

export class BookmarkTreeItem extends TreeItem {
    public base: Bookmark | Group | null = null;

    static fromBookmark(bookmark: Bookmark): BookmarkTreeItem {
        const label = (typeof bookmark.name !== 'undefined' ? bookmark.name : '');
        const result = new BookmarkTreeItem(label, TreeItemCollapsibleState.None);
        result.contextValue = 'bookmark';
        result.description = bookmark.lineText;
        // result.iconPath = bookmark.group!.decorationSvg.path;
        result.iconPath = new ThemeIcon("bookmark");
        result.base = bookmark;
        result.tooltip = workspace.asRelativePath(bookmark.fsPath) + ': ' + label;
        result.command = {
            "title": "jump to bookmark",
            "command": "bookmark-plugin.jumpToBookmark",
            "arguments": [bookmark]
        };
        return result;
    }

    static fromGroup(group: Group, isActiveGroup: boolean): BookmarkTreeItem {
        const label = group.name;
        const result = new BookmarkTreeItem(label, isActiveGroup ?TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed);
        result.contextValue = 'group';
        result.iconPath = ThemeIcon.Folder;
        result.base = group;
        result.tooltip = group.name;
        return result;
    }

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
