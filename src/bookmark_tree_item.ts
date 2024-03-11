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
            "command": "bookmark_x.jumpToBookmark",
            "arguments": [bookmark.get_full_uri()]
        };
        return result;
    }

    static fromGroup(group: Group, currActiveGroup: string): BookmarkTreeItem {
        const label = group.name;
        const get_collapse_state = () => {
            if (group.children.length > 0) {
                return currActiveGroup ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed
            } else {
                return TreeItemCollapsibleState.None
            }
        }
        const result = new BookmarkTreeItem(label, get_collapse_state());
        result.contextValue = 'group';
        if (currActiveGroup.startsWith(group.get_full_uri())) {
            result.iconPath = new ThemeIcon("folder-opened", new ThemeColor("textLink.activeForeground"));
        } else {
            result.iconPath = new ThemeIcon("folder");
        }
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
