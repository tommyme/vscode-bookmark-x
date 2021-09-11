import {
    ExtensionContext,
    Range,
    TextEditor,
    TextEditorDecorationType,
    window,
    Uri
} from 'vscode';
import {Bookmark} from './bookmark';
import {Group} from './group';
import {DecorationFactory} from './decoration_factory';
import {SerializableBookmark} from './serializable_bookmark';
import {SerializableGroup} from './serializable_group';
import {randomColor} from './util';
import {BookmarkTreeDataProvider} from './bookmark_tree_data_provider';

export class Main {
    public readonly savedBookmarksKey = 'bookmarkDemo.bookmarks'; // 缓存标签的key
    public readonly savedGroupsKey = "bookmarkDemo.groups";
    public readonly savedActiveGroupKey = "bookmarkDemo.activeGroup";
    public readonly defaultGroupName: string;
    public readonly defaultColor: string = "#F5DC31";

    private treeViewRefreshCallback = () => {};

    private ctx: ExtensionContext;
    private bookmarks: Array<Bookmark>;
    private groups: Array<Group>;
    private activeGroup: Group;
    private removedDecorations: Map<TextEditorDecorationType, boolean>;

    constructor(ctx: ExtensionContext, treeViewRefreshCallback: () => void) {
        this.ctx = ctx;
        this.treeViewRefreshCallback = treeViewRefreshCallback;
        this.bookmarks = new Array<Bookmark>(); // 当前所有的标签
        this.groups = new Array<Group>();


        this.defaultGroupName = 'default';
        this.activeGroup = new Group(this.defaultGroupName, this.defaultColor);
        this.removedDecorations = new Map<TextEditorDecorationType, boolean>();

        DecorationFactory.svgDir = this.ctx.globalStorageUri; // 缓存地址

        this.restoreSavedState(); // 读取上一次记录的状态
        this.updateDecorations(); // 更新界面的标签
    }

    // 保存状态
    private saveState() {
        const serializedGroups = this.groups.map(group => SerializableGroup.fromGroup(group));
        this.ctx.workspaceState.update(this.savedGroupsKey, serializedGroups);
        const serializedBookmarks: SerializableBookmark[] = [];
        for (let i = 0; i < this.bookmarks.length; i++) {
            const bookmark = SerializableBookmark.fromBookmark(this.bookmarks[i]);
            serializedBookmarks.push(bookmark);
        }
        this.ctx.workspaceState.update(this.savedBookmarksKey, serializedBookmarks);
        this.ctx.workspaceState.update(this.savedActiveGroupKey, this.activeGroup.name);
    }

    // 读取上一次记录的状态
    private restoreSavedState() {
        const activeGroupName: string = this.ctx.workspaceState.get(this.savedActiveGroupKey) ?? this.defaultGroupName; // 不存在的情况，使用默认分组
        const serializedGroups: Array<SerializableGroup> | undefined = this.ctx.workspaceState.get(this.savedGroupsKey);
        const serializedBookmarks: SerializableBookmark[] | undefined = this.ctx.workspaceState.get(this.savedBookmarksKey);

        // 初始化分组
        if (serializedGroups !== undefined) {
            for (let i = 0; i < serializedGroups.length; i++) {
                this.addNewGroup(Group.fromSerializableGroup(serializedGroups[i]));
            }
            this.groups.sort(Group.sortByName);
        }

        // 初始化标签
        if (serializedBookmarks !== undefined) {
            for (let i = 0; i < serializedBookmarks.length; i++) {
                const serializedBookmark = Bookmark.fromSerializableBookMark(serializedBookmarks[i], this.getGroupByName.bind(this)); // 反序列化数据
                this.bookmarks.push(serializedBookmark);
                this.bookmarks.sort(Bookmark.sortByLocation);
            }
        }

        // 激活分组
        this.activateGroup(activeGroupName);
    }

    // 激活or取消标签
    public editorActionToggleBookmark(textEditor: TextEditor) {
        if (textEditor.selections.length === 0) {
            return;
        }

        let documentFsPath = textEditor.document.uri.fsPath;
        // 可能存在着多个光标
        for (let selection of textEditor.selections) {
            let lineNumber = selection.start.line;
            let characterNumber = selection.start.character;
            let lineText = textEditor.document.lineAt(lineNumber).text.trim();

            this.toggleBookmark(
                documentFsPath,
                lineNumber,
                characterNumber,
                lineText,
                this.activeGroup,
            );
        }
    }

    public editorActionToggleLabeledBookmark(textEditor: TextEditor) {
        if (textEditor.selections.length === 0) {
            return;
        }
        
        const fsPath = textEditor.document.uri.fsPath;
        const lineNumber = textEditor.selection.start.line;

        // 获取已存在的标签
        const existingBookmark = this.getExistingBookmarks(fsPath).find((bookmark) => {
            return bookmark.lineNumber === lineNumber && this.activeGroup.getDecoration() === bookmark.getDecoration();
        });

        if (typeof existingBookmark !== "undefined") {
            this.deleteBookmark(existingBookmark);
            this.saveState();
            this.updateDecorations();
            return;
        }

        const selectedText = textEditor.document.getText(textEditor.selection).trim();

        window.showInputBox({
            placeHolder: '请输入标签文本',
            value: selectedText,
            valueSelection: [0, selectedText.length],
        }).then((label) => {
            if (label !== '') {
                const characterNumber = textEditor.selection.start.character;
                const lineText = textEditor.document.lineAt(lineNumber).text.trim();

                const bookmark = new Bookmark(
                    fsPath,
                    lineNumber,
                    characterNumber,
                    label,
                    lineText,
                    this.activeGroup
                );
                this.bookmarks.push(bookmark);
                this.bookmarks.sort(Bookmark.sortByLocation);
            }

            this.saveState();
            this.updateDecorations();
        });
    }

    // 切换标签
    private toggleBookmark(
        fsPath: string,
        lineNumber: number,
        characterNumber: number,
        lineText: string,
        group: Group,
    ) {
        // 获取已存在的标签
        const existingBookmark = this.getExistingBookmarks(fsPath).find((bookmark) => {
            return bookmark.lineNumber === lineNumber && this.activeGroup.getDecoration() === bookmark.getDecoration();
        });

        // 如果已存在标签，就删除
        if (existingBookmark) {
            this.deleteBookmark(existingBookmark);
        } else {
            let bookmark = new Bookmark(fsPath, lineNumber, characterNumber, undefined, lineText, group);
            this.bookmarks.push(bookmark);
        }

        this.updateDecorations(); // 更新界面
        this.saveState(); // 保存最新状态
    }

    // 删除标签
    private deleteBookmark(bookmark: Bookmark) {
        let index = this.bookmarks.indexOf(bookmark);
        if (index < 0) {
            return;
        }

        this.bookmarks.splice(index, 1);
        this.handleDecorationRemoved(bookmark.getDecoration()!);
    }

    // 添加新分组
    public actionAddGroup() {
        window.showInputBox({
            placeHolder: "分组名",
            prompt: "请输入新的分组名",
        }).then((groupName) => {
            groupName = groupName?.trim();
            if (!groupName) {
                return;
            }

            this.activateGroup(groupName);
            this.saveState();
        });
    }

    private addNewGroup(group: Group) {
        group.onGroupDecorationUpdated(this.handleGroupDecorationUpdated.bind(this));
        group.initDecorations();
        this.groups.push(group);
        this.groups.sort(Group.sortByName);
    }

    // 激活分组
    private activateGroup(name: string) {
        let newActiveGroup = this.ensureGroup(name);
        if (newActiveGroup === this.activeGroup) {
            return;
        }

        this.activeGroup = newActiveGroup;
    }

    // 返回已存在分组or创建分组
    private ensureGroup(name: string): Group {
        let group = this.groups.find((group) => {
            return group.name === name;
        });

        if (typeof group !== 'undefined') {
            return group;
        }

        // 初始化的情况
        group = new Group(name, name === this.defaultGroupName ? this.defaultColor : randomColor());
        this.addNewGroup(group);

        return group;
    }

    // 通过分组名返回分组
    private getGroupByName(groupName: string): Group {
        return this.groups.find((group) => group.name === groupName) ?? this.activeGroup;
    }

    public getActiveGroup() {
        return this.activeGroup;
    }

    public setActiveGroup(groupName: string) {
        this.activateGroup(groupName);
        this.saveState();
    }

    // 监听标签更新的时机
    private handleGroupDecorationUpdated() {
        this.updateDecorations();
    }

    // 更新每个页面的标签
    private updateDecorations() {
        for (let editor of window.visibleTextEditors) {
            this.updateEditorDecorations(editor);
        }
        this.treeViewRefreshCallback();
    }

    // 绘制标签
    private updateEditorDecorations(textEditor: TextEditor) {
        if (typeof textEditor === 'undefined') {
            return;
        }

        let fsPath = textEditor.document.uri.fsPath;
        let editorDecorations = this.getDecorationsList(fsPath);

        // 清除无用、重叠的标签
        for (let [removedDecoration] of this.removedDecorations) {
            if (editorDecorations.has(removedDecoration)) {
                continue;
            }

            editorDecorations.set(removedDecoration, []);
        }

        for (let [decoration, ranges] of editorDecorations) {
            textEditor.setDecorations(decoration, ranges);
        }
    }

    // 获取标签ranges
    private getDecorationsList(fsPath: string): Map<TextEditorDecorationType, Range[]> {
        const editorDecorations = new Map<TextEditorDecorationType, Range[]>();
        const lineDecorations = new Map<number, TextEditorDecorationType>();

        // 筛选当前页面的标签
        let fileBookmarks = this.bookmarks.filter((bookmark) => {
            return bookmark.fsPath === fsPath;
        });

        // 筛选当前激活分组的标签
        fileBookmarks.filter(bookmark => bookmark.group === this.activeGroup)
            .forEach(bookmark => {
                let decoration = bookmark.getDecoration();
                if (decoration !== null) {
                    lineDecorations.set(bookmark.lineNumber, decoration);
                }
            });

        // 筛选非激活的标签
        fileBookmarks.filter(bookmark => bookmark.group !== this.activeGroup)
            .forEach(bookmark => {
                let decoration = bookmark.getDecoration();
                if (decoration !== null) {
                    if (!lineDecorations.has(bookmark.lineNumber)) {
                        lineDecorations.set(bookmark.lineNumber, decoration);
                    } else {
                        // 重叠的标签，需要放入清除列表里面
                        this.handleDecorationRemoved(decoration);
                    }
                }
            });

        // 遍历需要绘制的图标
        for (let [lineNumber, decoration] of lineDecorations) {
            let ranges = editorDecorations.get(decoration);
            if (typeof ranges === 'undefined') {
                ranges = new Array<Range>();
                editorDecorations.set(decoration, ranges);
            }

            ranges.push(new Range(lineNumber, 0, lineNumber, 0));
        }

        return editorDecorations;
    }

    // 记录需要移除的图标
    private handleDecorationRemoved(decoration: TextEditorDecorationType) {
        this.removedDecorations.set(decoration, true);
    }

    // 获取已存在的标签
    private getExistingBookmarks(fsPath: string): Array<Bookmark> {
        return this.bookmarks.filter((bookmark) => {
            return bookmark.fsPath === fsPath;
        });
    }

    // 初始化分组列表数据
    public getTreeDataProviderByGroup() {
        return new BookmarkTreeDataProvider(this.groups, this.bookmarks, this.getActiveGroup.bind(this), true);
    }

    // 初始化文件列表数据
    public getTreeDataProviderByFile() {
        return new BookmarkTreeDataProvider(this.groups, this.bookmarks, this.getActiveGroup.bind(this), false);
    }

    public jumpToBookmark(bookmark: Bookmark,) {
        window.showTextDocument(Uri.file(bookmark.fsPath), {
            selection: new Range(
                bookmark.lineNumber,
                bookmark.characterNumber,
                bookmark.lineNumber,
                bookmark.characterNumber
            )
        });
    }
}