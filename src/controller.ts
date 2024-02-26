import {
    ExtensionContext,
    Range,
    TextEditor,
    TextEditorDecorationType,
    window,
    Uri,
    workspace
} from 'vscode';
import * as path from 'path'
import { Bookmark, RootGroup } from "./functional_types";
import {Group} from './functional_types';
import {SerializableGroup} from './serializable_type';
import * as util from './util';
import {BookmarkTreeDataProvider} from './bookmark_tree_data_provider';

export class Controller {
    public readonly savedBookmarksKey = 'bookmarkDemo.bookmarks'; // 缓存标签的key
    public readonly savedRootNodeKey = "bookmarkDemo.root_Node";
    public readonly savedActiveGroupKey = "bookmarkDemo.activeGroup";
    public readonly defaultGroupName = "";

    private treeViewRefreshCallback = () => {};

    private ctx: ExtensionContext;
    public activeGroup!: Group;
    private decos2remove: Array<TextEditorDecorationType>=[];
    private fake_root_group!: RootGroup;
    public tprovider: BookmarkTreeDataProvider;

    constructor(ctx: ExtensionContext, treeViewRefreshCallback: () => void) {
        this.ctx = ctx
        this.treeViewRefreshCallback = treeViewRefreshCallback;
        // DecorationFactory.svgDir = this.ctx.globalStorageUri; // 缓存地址
        this.restoreSavedState(); // 读取上一次记录的状态 初始化fake root group
        this.tprovider = new BookmarkTreeDataProvider(this.fake_root_group, this)
    }

    // 保存状态 activeGroupName and fake_root_group(serialized)
    public saveState() {
        const content = this.fake_root_group.serialize();
        this.ctx.workspaceState.update(this.savedRootNodeKey, content);
        this.ctx.workspaceState.update(this.savedActiveGroupKey, this.activeGroup.get_full_uri());
    }

    /**
     * restore fake_root_group; set ActivateGroup
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    private restoreSavedState() {
        const activeGroupUri: string = this.ctx.workspaceState.get(this.savedActiveGroupKey) ?? this.defaultGroupName; // 不存在的情况，使用默认分组
        let rootNodeSerialized: SerializableGroup | undefined = this.ctx.workspaceState.get(this.savedRootNodeKey);
        // rootNodeSerialized = undefined
        if (rootNodeSerialized) {
            this.fake_root_group = SerializableGroup.build_root(rootNodeSerialized) as RootGroup
        } else {
            this.fake_root_group = new RootGroup("", "", "", [])
        }
        this.activeGroup = this.fake_root_group.get_node(activeGroupUri, 'group') as Group
        this.fake_root_group.cache_build()
    }
    /**
     * 装饰器 执行完动作之后update和save一下
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public static DecoUpdateSaveAfter(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const fn = descriptor.value
        descriptor.value = function(...rest: any) {
            fn.apply(this, rest)
            let x: any = this
            x.updateDecorations(); // 更新界面
            x.saveState(); // 保存最新状态
        }
    }


    /**
     * command palette触发的toggleBookmark
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public actionToggleBookmark(textEditor: TextEditor) {
        if (textEditor.selections.length === 0) {
            return;
        }

        let documentFsPath = textEditor.document.uri.fsPath;
        // 可能存在着多个光标
        for (let selection of textEditor.selections) {
            let line = selection.start.line;
            let col = selection.start.character;
            let lineText = textEditor.document.lineAt(line).text.trim();

            this.toggleBookmark(
                documentFsPath,
                line,
                col,
                lineText,
                this.activeGroup,
            );
        }
    }

    /**
     * command palette 触发的toggle labeled bookmark
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public actionToggleLabeledBookmark(textEditor: TextEditor) {
        if (textEditor.selections.length === 0) {
            return;
        }
        
        const fsPath = textEditor.document.uri.fsPath;
        const lineNumber = textEditor.selection.start.line;

        // 获取已存在的标签
        const existingBookmark = this.getBookmarksInFile(fsPath).find((bookmark) => {
            return bookmark.line === lineNumber && this.activeGroup.getDecoration() === bookmark.getDecoration();
        });

        if (typeof existingBookmark !== "undefined") {
            this.deleteBookmark(existingBookmark);
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
                    this.activeGroup.uri
                );
                if (!this.addBookmark(bookmark)) {
                    window.showInformationMessage(`label与存在的bookmark冲突`);
                    return
                }
            } else {
                window.showInformationMessage(`输入的label为空!`);
                return
            }
        });
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
            let new_group = this.createGroupWithUri(groupName)
            this.addGroup2Root(new_group)
        });
    }

    public async actionSaveSerializedRoot() {
        let content: string = JSON.stringify(this.fake_root_group.serialize(), undefined, 2)
        let proj_folder = workspace.workspaceFolders![0].uri.path
        let uri = Uri.file(
            path.join(proj_folder, '.vscode', 'bookmark_x.json')
        );
        let bytes = Uint8Array.from(content.split('').map(c => c.charCodeAt(0)));
        await workspace.fs.writeFile(uri, bytes)
        window.showInformationMessage("保存完毕")
    }
    public async actionLoadSerializedRoot() {
        let proj_folder = workspace.workspaceFolders![0].uri.path
        let uri = Uri.file(
            path.join(proj_folder, '.vscode', 'bookmark_x.json')
        );
        await workspace.fs.readFile(uri).then(
            content => {
                let obj = JSON.parse(content.toString())
                // let pre_root_group = this.fake_root_group
                this.fake_root_group = SerializableGroup.build_root(obj)
                this.fake_root_group.cache_build()
                // TODO 内存优化 delete this.fake_root_group
                this.tprovider.root_group = this.fake_root_group
                this.tprovider.treeview?.init(this)
                this.updateDecorations()
                this.saveState()
            }
        )

    }

    public actionClearData() {
        this.ctx.workspaceState.update(this.savedRootNodeKey, "");
        this.ctx.workspaceState.update(this.savedActiveGroupKey, "");
        this.restoreSavedState()
        this.tprovider.root_group = this.fake_root_group
        this.tprovider.treeview?.init(this)
        this.updateDecorations()
        this.saveState()
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
        const existingBookmark = this.getBookmarksInFile(fsPath).find((bookmark) => {
            return bookmark.line === lineNumber && this.activeGroup.getDecoration() === bookmark.getDecoration();
        });

        // 如果已存在标签，就删除
        if (existingBookmark) {
            this.deleteBookmark(existingBookmark)
        } else {
            let bookmark = new Bookmark(fsPath, lineNumber, characterNumber, util.randomName(), lineText, group.get_full_uri());
            // TODO 需要应对小概率的随机串碰撞
            this.addBookmark(bookmark)
        }
    }

    // 提供给treeView，删除标签
    public deleteBookmark(bookmark: Bookmark) {
        let group = this.fake_root_group.get_node(bookmark.uri, 'group') as Group
        let index = group.children.indexOf(bookmark);
        if (index < 0) {
            return;
        }

        group.children.splice(index, 1);
        this.decos2remove.push(bookmark.getDecoration()!);

        this.updateDecorations();
        this.fake_root_group.cache_del_bm(bookmark)
        this.saveState();
    }

    // 编辑label
    private _editBookmarkLabel(bookmark: Bookmark, val: string) {
        let group = this.fake_root_group.get_node(bookmark.uri, "group") as Group

        let index = group.children.indexOf(bookmark);
        if (index < 0) {
            // TODO tip
            return;
        }

        group.children[index].name = val;
    }
    public editBookmarkLabel(bookmark: Bookmark, val: string): boolean {
        // 命名冲突
        if ( this.fake_root_group.cache.check_uri_exists(util.joinTreeUri([bookmark.uri, val])) ) {
            return false
        }
        // TODO sort
        this.fake_root_group.cache.del(bookmark.get_full_uri())
        this._editBookmarkLabel(bookmark, val)
        this.fake_root_group.cache_add_bm(bookmark)
        this.saveState()
        this.updateDecorations()
        return true
    }

    /**
     * 提供给treeView，删除分组
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public deleteGroups(group: Group) {
        const wasActiveGroupDeleted = group === this.activeGroup;
        let father_group = this.fake_root_group.get_node(group.uri, "group") as Group
        let idx = father_group.children.indexOf(group)
        if (idx < 0) {
            // TODO tip
            return
        }
        father_group.children.splice(idx, 1)

        if (wasActiveGroupDeleted) {
            // 如果激活组被删除了, 就换一个组设置激活
            this.activateGroup(this.fake_root_group.get_full_uri());
        }

        this.updateDecorations();
        this.saveState();
    }

    private addGroup2Root(group: Group): boolean {
        
        if ( this.fake_root_group.cache.check_uri_exists(group.get_full_uri()) ) {
            return false
        }
        let father = this.fake_root_group.add_group(group)
        father.sortGroupBookmark()
        this.updateDecorations()
        this.saveState()
        return true
    }

    public addBookmark(bm: Bookmark): boolean {
        // uri confliction
        if (this.fake_root_group.cache.check_uri_exists(bm.get_full_uri())) {
            return false
        }
        let group = this.fake_root_group.add_bookmark_recache(bm)
        group.sortGroupBookmark()
        this.updateDecorations()
        this.saveState()
        return true
    }

    /**
     * 激活分组 'test/main' -> 激活test下面的main 分组
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public activateGroup(uri: string) {
        let group = this.fake_root_group.get_node(uri, "group") as Group
        if (group === this.activeGroup) {
            return;
        }
        this.activeGroup = group;
        this.saveState()
    }

    /**
     * 通过uri创建分组
     * @param {type} full_uri - group uri
     * @returns {type} - Group
     */
    private createGroupWithUri(full_uri: string): Group {
        let [group_uri, group_name] = util.splitString(full_uri)
        let group = new Group(group_name, util.randomColor(), group_uri);
        return group
    }

    /**
     * 更新每个页面的标签
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public updateDecorations() {
        for (let editor of window.visibleTextEditors) {
            if (typeof editor === 'undefined') {
                return;
            }
    
            let fsPath = editor.document.uri.fsPath;
            let editorDecos = this.getDecoListInFile(fsPath);
    
            // remove decos in this.decos2remove
            this.decos2remove.forEach(deco2rm => {
                if (editorDecos.has(deco2rm)) {
                    editorDecos.set(deco2rm, [])    // 设置空的range参数, 后面调用setDecorations的时候就会删除
                }
            })
            
            // set decos, remove decos
            for (let [decoration, ranges] of editorDecos) {
                editor.setDecorations(decoration, ranges);
            }

            this.decos2remove = []
        }
        this.treeViewRefreshCallback();
    }

    /**
     * 返回editorDecorations
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    private getDecoListInFile(fsPath: string): Map<TextEditorDecorationType, Range[]> {
        const editorDecorations = new Map<TextEditorDecorationType, Range[]>();
        const lineDecorations = new Map<number, TextEditorDecorationType>();

        // 筛选当前页面的标签
        let fileBookmarks = this.getBookmarksInFile(fsPath)

        // 在当前group
        fileBookmarks.filter(bookmark => bookmark.group == this.activeGroup)
            .forEach(bookmark => {
                let decoration = bookmark.getDecoration();
                if (decoration !== null) {
                    lineDecorations.set(bookmark.line, decoration);
                } else {
                    let a=1
                }
            });

        // 不在当前group
        fileBookmarks.filter(bookmark => bookmark.group != this.activeGroup)
            .forEach(bookmark => {
                let decoration = bookmark.getDecoration();
                if (decoration !== null) {
                    if (!lineDecorations.has(bookmark.line)) {
                        // 其他组里面的, 和当前组里面的没有冲突
                        lineDecorations.set(bookmark.line, decoration);
                    } else {
                        // 其他组里面的, 和当前组里面有冲突
                        this.decos2remove.push(decoration);
                    }
                }
            });

        // 基于lineDeco 创建 editorDeco
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

    // 获取已存在的标签
    private getBookmarksInFile(fsPath: string): Array<Bookmark> {
        let fileBookmarks: Array<Bookmark> = []
        this.fake_root_group.cache.keys().forEach(full_uri => {
           let item = this.fake_root_group.cache.get(full_uri) as Bookmark
           if (item.type === "bookmark" && ((item.fsPath || null) === fsPath)) { fileBookmarks.push(item) }
        })
        return fileBookmarks
    }

    /**
     * need to refresh linetext
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public jumpToBookmark(bookmark_uri: string) {
        let bookmark = this.fake_root_group.get_node(bookmark_uri, "bookmark") as Bookmark
        window.showTextDocument(Uri.file(bookmark.fsPath), {
            selection: new Range(
                bookmark.line,
                bookmark.col,
                bookmark.line,
                bookmark.col
            )
        }).then(
            editor => {
                // 更新lineText
                let lineText = editor.document.lineAt(bookmark.line).text.trim()
                if (lineText != bookmark.lineText) {
                    bookmark.lineText = lineText
                    this.treeViewRefreshCallback()
                    this.saveState()
                }
            }
        )
    }
}