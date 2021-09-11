import {ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri as string, workspace} from 'vscode';
import {Bookmark} from './bookmark';
import {Group} from './group';

export class BookmarkTreeItem extends TreeItem {
    private base: Bookmark | Group | string | null = null;
    private parent: BookmarkTreeItem | null = null;
    private filterGroup: Group | null = null;

    static fromNone(): BookmarkTreeItem {
        const result = new BookmarkTreeItem(' ', TreeItemCollapsibleState.None);
        result.contextValue = 'none';
        result.description = 'none';
        result.tooltip = 'none';
        result.base = null;
        return result;
    }

    static fromBookmark(bookmark: Bookmark): BookmarkTreeItem {
        const label = (bookmark.lineNumber + 1) + (typeof bookmark.label !== 'undefined' ? ': ' + bookmark.label : '');
        const result = new BookmarkTreeItem(label, TreeItemCollapsibleState.None);
        result.contextValue = 'bookmark';
        result.description = bookmark.lineText;
        result.iconPath = bookmark.group.decorationSvg;
        result.base = bookmark;
        result.tooltip = workspace.asRelativePath(bookmark.fsPath) + ': ' + label;
        return result;
    }

    static fromGroup(group: Group): BookmarkTreeItem {
        const label = group.name;
        const result = new BookmarkTreeItem(label, TreeItemCollapsibleState.Expanded);
        result.contextValue = 'group';
        result.iconPath = group.decorationSvg;
        result.base = group;
        result.filterGroup = group;
        result.tooltip = group.name;
        return result;
    }

    static fromFSPath(fsPath: string, filterGroup: Group | null): BookmarkTreeItem {
        const result = new BookmarkTreeItem(string.file(fsPath), TreeItemCollapsibleState.Expanded);
        result.contextValue = 'file';
        result.iconPath = ThemeIcon.File;
        result.base = fsPath;
        result.filterGroup = filterGroup;
        result.tooltip = workspace.asRelativePath(fsPath);
        return result;
    }

    public setParent(parent: BookmarkTreeItem | null) {
        this.parent = parent;
    }

    public getParent(): BookmarkTreeItem | null {
        return this.parent;
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

    public getFilterGroup(): Group | null {
        return this.filterGroup;
    }
}
