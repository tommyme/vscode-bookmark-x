import {EventEmitter, TreeDataProvider, TreeItem} from 'vscode';
import {Bookmark} from './bookmark';
import {BookmarkTreeItem} from './bookmark_tree_item';
import {Group} from './group';

export class BookmarkTreeDataProvider implements TreeDataProvider<BookmarkTreeItem> {

    private groups: Array<Group>;
    private bookmarks: Array<Bookmark>;
    private byGroup: boolean;
    private changeEmitter = new EventEmitter<BookmarkTreeItem | undefined | null | void>();
    private getActiveGroup: () => Group;
    readonly onDidChangeTreeData = this.changeEmitter.event;

    constructor(groups: Array<Group>, bookmarks: Array<Bookmark>, getActiveGroup: () => Group, byGroup: boolean) {
        this.groups = groups;
        this.bookmarks = bookmarks;
        this.byGroup = byGroup;
        this.getActiveGroup = getActiveGroup;
    }

    public getTreeItem(element: BookmarkTreeItem): TreeItem {
        return element;
    }

    // 初始化tree item
    public getChildren(element?: BookmarkTreeItem | undefined): Thenable<any> {
        if (!element) {
            // 渲染根节点
            return this.byGroup ? this.renderGroupViewRoot() : this.renderFileViewRoot();
        }

        const filterGroup = element.getFilterGroup();
        const baseFSPath = element.getBaseFSPath();

        if (baseFSPath !== null) {
            // 渲染一个文件里的所有标签
            return this.renderFileViewItem(element, baseFSPath, filterGroup);
        }

        const baseGroup = element.getBaseGroup();
        if (baseGroup !== null) {
            // 渲染一个分组里的所有标签
            return this.renderGroupViewItem(element, filterGroup);
        }

        return Promise.resolve([]);
    }

    // 渲染一个文件里的所有标签
    private renderFileViewItem(element: BookmarkTreeItem, baseFSPath: string, filterGroup: Group | null) {
        let bookmarks = this.bookmarks.filter(bookmark => bookmark.fsPath === baseFSPath);
        if (filterGroup !== null) {
            bookmarks = bookmarks.filter(bookmark => bookmark.group === filterGroup);
        }

        let children: Array<BookmarkTreeItem>;

        if (bookmarks.length === 0) {
            children = [BookmarkTreeItem.fromNone()];
        } else {
            children = bookmarks.map(bookmark => BookmarkTreeItem.fromBookmark(bookmark));
        }

        children.forEach(child => child.setParent(element));
        return Promise.resolve(children);
    }

    // 渲染一个分组里的所有标签
    private renderGroupViewItem(element: BookmarkTreeItem, filterGroup: Group | null) {
        const files = this.getFiles(this.bookmarks.filter(bookmark => bookmark.group === filterGroup));

        let children: Array<BookmarkTreeItem>;

        if (files.length === 0) {
            children = [BookmarkTreeItem.fromNone()];
        } else {
            children = files.map(fsPath => BookmarkTreeItem.fromFSPath(fsPath, filterGroup));
        }

        children.forEach(child => child.setParent(element));
        return Promise.resolve(children);
    }

    // 渲染所有的分组
    private renderGroupViewRoot() {
        const root = this.groups.map(group => {
            const isActiveGroup = this.getActiveGroup().name === group.name;
            return BookmarkTreeItem.fromGroup(group, isActiveGroup);
        });
        return Promise.resolve(root);
    }

    // 渲染所有的文件列表
    private renderFileViewRoot() {
        const root = this.getFiles(this.bookmarks)
            .map(fsPath => BookmarkTreeItem.fromFSPath(fsPath, null));
        return Promise.resolve(root);
    }

    private getFiles(bookmarks: Array<Bookmark>): Array<string> {
        const files = new Array<string>();
        for (let i = 0; i < bookmarks.length; i++) {
            const file = bookmarks[i];
            if (!files.includes(file.fsPath)) {
                files.push(file.fsPath);
            }
        }
        return files;
    }

    public refresh() {
        this.changeEmitter.fire();
    }
}