import {
    ExtensionContext,
    Range,
    TextEditor,
    TextEditorDecorationType,
    window,
    Uri,
    workspace,
    TextDocumentChangeEvent,
    TreeItemCollapsibleState
} from 'vscode';
import * as vscode from 'vscode'
import * as path from 'path';
import { Bookmark, GroupBookmark, NodeType, NodeUriMap, RootGroup, ViewItemUriMap } from "./functional_types";
import { Group } from './functional_types';
import { SerializableGroup } from './serializable_type';
import {ITEM_TYPE_BM, ITEM_TYPE_GROUP, ITEM_TYPE_GROUP_LIKE} from "./constants";
import * as util from './util';
import { BookmarkTreeDataProvider } from './bookmark_tree_data_provider';
import { TextEncoder } from 'util';
import { DecorationFactory } from './decoration_factory';
import { BookmarkTreeItemFactory } from './bookmark_tree_item';
import { BookmarkTreeViewManager } from './bookmark_tree_view';
import { TaskTreeViewManager } from './views/quick_run/view_manager';

export class SpaceMap {
    static root_group_map: {[key: string]: RootGroup} = {};
    static active_group_map: {[key: string]: Group} = {};
}



export class Controller {
    public readonly savedBookmarksKey = 'bookmarkDemo.bookmarks'; // 缓存标签的key
    public readonly savedRootNodeKey = "bookmarkDemo.root_Node";
    public readonly savedActiveGroupKey = "bookmarkDemo.activeGroup";
    public readonly defaultGroupName = "";

    private ctx: ExtensionContext;
    // public activeGroup!: Group;
    private decos2remove = new Map<TextEditorDecorationType, number>();
    // public fake_root_group!: RootGroup;
    public tprovider!: BookmarkTreeDataProvider;
    public _range?: Range;
    private _wsf!: vscode.WorkspaceFolder;
    // public wsf: vscode.WorkspaceFolder;
    // public fake_root_group.vicache!: ViewItemUriMap;

    get fake_root_group(): RootGroup {
        return SpaceMap.root_group_map[this.wsf.uri.path];
    }

    set fake_root_group(val: RootGroup) {
        SpaceMap.root_group_map[this.wsf.uri.path] = val;
    }

    get activeGroup(): Group {
        return SpaceMap.active_group_map[this.wsf.uri.path];
    }
    set activeGroup(group: Group) {
        SpaceMap.active_group_map[this.wsf.uri.path] = group;
    }

    get wsf(): vscode.WorkspaceFolder {
        let fake_wsf = {
            uri: vscode.Uri.file("/path/to/404"),
            name: "",
            index: -1,
        }
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return fake_wsf;
        }
        if (!this._wsf) {
            return fake_wsf;
        } else {
            return this._wsf;
        }
        // let default_wsf = vscode.workspace.workspaceFolders[0];
        // return default_wsf;
    }
    set wsf(val: vscode.WorkspaceFolder) {
        this._wsf = val;
    }

    constructor(ctx: ExtensionContext) {
        console.log("controller init");
        this.ctx = ctx;
        BookmarkTreeItemFactory.controller = this;
        this.tprovider = new BookmarkTreeDataProvider(this);
        // DecorationFactory.svgDir = this.ctx.globalStorageUri; // 缓存地址
        workspace.workspaceFolders?.forEach(wsf => {
            this.wsf = wsf;
            this.restoreSavedState(); // 读取上一次记录的状态 初始化fake root group
            this.init_with_fake_root();
        });
    }

    // 保存状态 activeGroupName and fake_root_group(serialized)
    public saveState() {
        const content = this.fake_root_group.serialize();
        this.ctx.workspaceState.update(this.savedRootNodeKey, content);
        this.ctx.workspaceState.update(this.savedActiveGroupKey, this.activeGroup.get_full_uri());
    }

    public actionLoadAllWsfState() {
        if (workspace.workspaceFolders) {
            workspace.workspaceFolders.forEach(wsf => {
                this.actionLoadSerializedRoot(wsf);
            });
        }
    }

    public actionSaveAllWsfState() {
        if (workspace.workspaceFolders) {
            workspace.workspaceFolders.forEach(wsf => {
                this.actionLoadSerializedRoot(wsf);
            });
        }
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
            // TODO 针对fspath 不存在的书签 改变其显示样式 显示提示框，是否删除这些失效书签
            // 如果有
            this.fake_root_group = SerializableGroup.build_root(rootNodeSerialized) as RootGroup;
        } else {
            // 如果没有 遍历所有wsf 创建对应的root group
            this.fake_root_group = new RootGroup("", "", "", []);
        }
        this.activeGroup = this.fake_root_group.get_node(activeGroupUri, ITEM_TYPE_GROUP) as Group;
        if (!this.activeGroup) {
            this.activeGroup = this.fake_root_group;
            this.ctx.workspaceState.update(this.savedActiveGroupKey, "");
        }
    }

    public init_with_fake_root() {
        this.tprovider.root_group = this.fake_root_group;
        this.fake_root_group.cache = this.fake_root_group.bfs_get_nodes();
        this.fake_root_group.vicache = this.fake_root_group.bfs_get_tvmap();
        // this.node_map = this.fake_root_group.cache;
        this.fake_root_group.sortGroupBookmark();
        console.log("node map keys:", this.fake_root_group.cache.keys());
        console.log("view item map keys:", this.fake_root_group.vicache.keys());
        console.log("restore saved state done");
    }
    /**
     * 装饰器 执行完动作之后update和save一下
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public static DecoUpdateSaveAfter(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const fn = descriptor.value;
        descriptor.value = function (...rest: any) {
            fn.apply(this, rest);
            let x: any = this;
            x.updateDecorations(); // 更新界面
            x.saveState(); // 保存最新状态
        };
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
        let xx = workspace.getWorkspaceFolder(textEditor.document.uri);
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
            return bookmark.line === lineNumber;
        });

        if (typeof existingBookmark !== "undefined") {
            this.deleteBookmark(existingBookmark);
            return;
        }

        const selectedText = textEditor.document.getText(textEditor.selection).trim();
        this.inputBoxGetName(selectedText).then((label) => {
            const characterNumber = textEditor.selection.start.character;
            const lineText = textEditor.document.lineAt(lineNumber).text.trim();

            const bookmark = new Bookmark(
                fsPath,
                lineNumber,
                characterNumber,
                label,
                lineText,
                this.activeGroup.get_full_uri()
            );
            if (!this.addBookmark(bookmark)) {
                window.showInformationMessage(`Label conflicts with existing bookmarks`);
                return;
            }
        });
    }

    public inputBoxGetName(value="") {
        return window.showInputBox({
            placeHolder: "node name",
            prompt: "Please enter a new node name",
            value: value
        }).then((nodeName) => {
            nodeName = nodeName?.trim();
            if (nodeName === "") {
                let err_msg = "empty node name not allowed.";
                window.showInformationMessage(err_msg);
                throw new Error(err_msg);
            } else if (nodeName === undefined) {
                throw new Error("user canceled");
            } else if (nodeName.includes("/")) {
                let err_msg = "nodename can't include slash";
                window.showInformationMessage(err_msg);
                throw new Error(err_msg);
            } else {
                return nodeName;
            }
        });
    }
    public addGroup(uri: string) {
        let new_group = this.createGroupWithUri(uri);
        let res = this.addGroup2Root(new_group);
        if (res) {
            window.showInformationMessage('group: ' + uri + ' Created Successfully');
        } else {
            window.showInformationMessage('group: ' + uri + ' Creation Failed, exists');
        }
    }
    // 添加新分组
    public actionAddGroup() {
        this.inputBoxGetName().then((groupName: String) => {
            let uri = util.joinTreeUri([this.activeGroup.get_full_uri(), groupName]);
            this.addGroup(uri);
        });
    }

    public async actionSaveSerializedRoot(wsf: vscode.WorkspaceFolder|null=null) {
        if (wsf === null) {
            wsf = workspace.workspaceFolders![0];
        }
        let content: string = JSON.stringify(this.fake_root_group.serialize(), undefined, 2);
        let proj_folder = wsf.uri.path;
        let uri = Uri.file(
            path.join(proj_folder, '.vscode', 'bookmark_x.json')
        );
        const encoder = new TextEncoder();
        let bytes = encoder.encode(content);
        await workspace.fs.writeFile(uri, bytes);
        window.showInformationMessage("saved.");
    }
    public async actionLoadSerializedRoot(wsf: vscode.WorkspaceFolder|null=null) {
        if (wsf === null) {
            wsf = workspace.workspaceFolders![0];
        }
        let proj_folder = wsf.uri.path;
        let uri = Uri.file(
            path.join(proj_folder, '.vscode', 'bookmark_x.json')
        );
        await workspace.fs.readFile(uri).then(
            content => {
                let obj = JSON.parse(content.toString());
                this.wsf = wsf!;
                this.fake_root_group = SerializableGroup.build_root(obj);
                this.activeGroup = this.fake_root_group;
                this.init_with_fake_root();
            }
        );
    }

    public actionClearData() {
        this.ctx.workspaceState.update(this.savedRootNodeKey, "");
        this.ctx.workspaceState.update(this.savedActiveGroupKey, "");
        this.restoreSavedState();
        this.init_with_fake_root();
        this.updateDecorations();
        this.saveState();
    }

    // 切换标签
    private toggleBookmark(
        fsPath: string,
        lineNumber: number,
        characterNumber: number,
        lineText: string,
        group: Group,
    ) {
        // TODO 可以添加一个异常情况处理, 处理group 为undefined的时候
        // 获取已存在的标签
        const existingBookmark = this.getBookmarksInFile(fsPath).find((bookmark) => {
            return bookmark.line === lineNumber;
        });

        // 如果已存在标签，就删除
        if (existingBookmark) {
            this.deleteBookmark(existingBookmark);
        } else {
            let bookmark = new Bookmark(fsPath, lineNumber, characterNumber, util.randomName(), lineText, group.get_full_uri());
            // TODO 需要应对小概率的随机串碰撞
            this.addBookmark(bookmark);
        }
    }

    // 提供给treeView，删除标签
    public deleteBookmark(bookmark: Bookmark) {
        let group = this.fake_root_group.get_node(bookmark.uri) as Group;
        let index = group.children.indexOf(bookmark);
        if (index < 0) {
            return;
        }

        group.children.splice(index, 1);
        this.fake_root_group.cache.del(bookmark.get_full_uri());
        this.fake_root_group.vicache.del(bookmark.get_full_uri());
        this.updateDecorations();
        this.saveState();
    }

    public deleteBookmarks(bms: Array<Bookmark>) {
        bms.forEach(bm => {
            let group = this.fake_root_group.get_node(bm.uri) as Group;
            let index = group.children.indexOf(bm);
            group.children.splice(index, 1);
            this.fake_root_group.cache.del(bm.get_full_uri());
            this.fake_root_group.vicache.del(bm.get_full_uri());
        });
        this.updateDecorations();
        this.saveState();
    }

    /**
     * 编辑label 刷新children的uri 如果是group就刷新缓存
     */
    private _editNodeLabel(node: NodeType, val: string): Group | undefined {
        let father = this.fake_root_group.get_node(node.uri, "group") as Group;

        let index = father.children.indexOf(node);
        if (index < 0) {
            return undefined;
        }
        let original_full_uri = node.get_full_uri();
        father.children[index].name = val;
        let new_full_uri = node.get_full_uri();
        if (node.type == ITEM_TYPE_GROUP) {
            // bfs edit uri
            (node as Group).bfs_get_nodes().values().forEach(node => {
                node.uri = node.uri.replace(original_full_uri, new_full_uri);    // only replace once
            });
            // refresh cache
            this.fake_root_group.cache = this.fake_root_group.bfs_get_nodes();
            this.fake_root_group.vicache = this.fake_root_group.bfs_get_tvmap();
        }



        return father;
    }

    /**
     * 触发排序
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public editNodeLabel(node: Bookmark | Group, val: string): boolean {
        // 命名冲突
        if (this.fake_root_group.cache.check_uri_exists(util.joinTreeUri([node.uri, val]))) {
            return false;
        }
        // 前后的缓存操作 用于输入的是bm的场合
        this.fake_root_group.cache.del(node.get_full_uri());
        // change tree view item's label
        let tvitem = this.fake_root_group.vicache.get(node.get_full_uri());
        tvitem.label = val;

        this.fake_root_group.vicache.del(node.get_full_uri());
        
        let father = this._editNodeLabel(node, val);
        if (father) {
            father.sortGroupBookmark();
            this.fake_root_group.cache.set(node.get_full_uri(), node);
            this.fake_root_group.vicache.set(util.joinTreeUri([node.uri, val]), tvitem);
            // this.view_item_map.set(node.)
            this.saveState();
            this.updateDecorations();
            return true;
        } else {
            return false;
        }
    }

    public async safeDeleteGroups(group: Group): Promise<Boolean> {
        if (group.children.length > 0) {
            let val = await
            window.showInformationMessage(
                "the group not empty, do you really want to delete it?", 'yes', 'no'
            );
            if (val === 'yes') {
                this.deleteGroups(group);
                return true;
            } else { return false; }
        } else {
            this.deleteGroups(group);
            return true;
        }
    }

    /**
     * 提供给treeView，删除分组
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public deleteGroups(group: Group) {
        const activeGroupDeleted = util.isSubUriOrEqual(group.get_full_uri(), this.activeGroup.get_full_uri());
        let father_group = this.fake_root_group.get_node(group.uri) as Group;
        let idx = father_group.children.indexOf(group);
        if (idx < 0) {
            // TODO tip
            return;
        }
        father_group.children.splice(idx, 1);
        this.fake_root_group.cache.del_group(group.get_full_uri());
        this.fake_root_group.vicache.del_group(group.get_full_uri());
        if (activeGroupDeleted) {
            // 如果激活组被删除了, 就换一个组设置激活
            this.activateGroup(this.fake_root_group.get_full_uri());
            this.fake_root_group.vicache.refresh_active_icon_status(this.fake_root_group.get_full_uri());
        }

        this.updateDecorations();
        this.saveState();
    }

    public addGroup2Root(group: Group): boolean {

        if (this.fake_root_group.cache.check_uri_exists(group.get_full_uri())) {
            return false;
        }
        this.fake_root_group.cache.set(group.get_full_uri(), group);
        this.fake_root_group.vicache.set(group.get_full_uri(), BookmarkTreeItemFactory.createGroup(group));
        let father = this.fake_root_group.add_group(group);
        father.sortGroupBookmark();
        this.updateDecorations();
        this.saveState();
        return true;
    }

    public addBookmark(bm: Bookmark): boolean {
        // uri confliction
        if (this.fake_root_group.cache.check_uri_exists(bm.get_full_uri())) {
            return false;
        }
        let group = this.fake_root_group.add_node_recache_all(bm);
        group.sortGroupBookmark();
        this.updateDecorations();
        this.saveState();
        return true;
    }

    /**
     * 激活分组 'test/main' -> 激活test下面的main 分组
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public activateGroup(uri: string) {
        let group = this.fake_root_group.get_node(uri) as Group;
        if (group === this.activeGroup) {
            return;
        }
        this.activeGroup = group;
        this.updateDecorations();
        this.saveState();
    }

    /**
     * 通过uri创建分组
     * @param {type} full_uri - group uri
     * @returns {type} - Group
     */
    public createGroupWithUri(full_uri: string): Group {
        let [group_uri, group_name] = util.splitString(full_uri);
        let group = new Group(group_name, util.randomColor(), group_uri);
        return group;
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
            if (editorDecos.size === 0) {
                editor.setDecorations(DecorationFactory.decoration, []);
            }
            // set decos, remove decos
            for (let [decoration, ranges] of editorDecos) {
                editor.setDecorations(DecorationFactory.decoration, ranges);
            }

            this.decos2remove.clear();
        }
        this.fake_root_group.vicache.entries().forEach(([key, item]) => {
            let node = this.fake_root_group.cache.get(key);
            if (ITEM_TYPE_GROUP_LIKE.includes(node!.type)) {
                if (node!.children.length === 0) {
                    // update group state
                    item.collapsibleState = TreeItemCollapsibleState.None;
                } else {
                    item.collapsibleState = TreeItemCollapsibleState.Expanded;
                }
            }
        });
        BookmarkTreeViewManager.refreshCallback();
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
        let fileBookmarks = this.getBookmarksInFile(fsPath);

        fileBookmarks.forEach(bookmark => {
            let decoration = DecorationFactory.decoration;
            if (decoration !== null) {
                lineDecorations.set(bookmark.line, decoration);
            }
        });

        // 基于lineDeco 创建 editorDeco
        for (let [lineNumber, decoration] of lineDecorations) {
            let ranges = editorDecorations.get(decoration);
            if (typeof ranges === 'undefined') {
                ranges = new Array<Range>();
                editorDecorations.set(decoration, ranges);
            }
            let myrange = new Range(lineNumber, 0, lineNumber, 0);
            this._range = myrange;
            ranges.push(myrange);
        }

        return editorDecorations;
    }

    // 获取已存在的标签
    private getBookmarksInFile(fsPath: string): Array<Bookmark> {
        let fileBookmarks: Array<Bookmark> = [];
        this.fake_root_group.cache.keys().forEach(full_uri => {
            let item = this.fake_root_group.cache.get(full_uri) as Bookmark;
            if (item.fsPath === fsPath) {
                fileBookmarks.push(item);
            }
        });
        return fileBookmarks;
    }

    /**
     * need to refresh linetext
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public jumpToBookmark(bm: Bookmark) {
        // let bookmark = this.fake_root_group.get_node(bm.get_full_uri()) as Bookmark;
        window.showTextDocument(Uri.file(bm.fsPath), {
            selection: new Range(
                bm.line,
                bm.col,
                bm.line,
                bm.col
            )
        }).then(
            editor => {
                // 更新lineText
                let lineText = editor.document.lineAt(bm.line).text.trim();
                if (lineText !== bm.lineText) {
                    bm.lineText = lineText;
                    this.fake_root_group.vicache.get(bm.get_full_uri()).description = lineText;
                    BookmarkTreeViewManager.refreshCallback();
                    this.saveState();
                }
            }
        );
    }

    public documentChangeHandle(event: TextDocumentChangeEvent) {
        let changes = event.contentChanges;
        if (changes.length === 0) { return; }
        let fsPath = event.document.uri.fsPath;
        // 针对常见场景优化 如单个、多个字符(除了\n)的书写
        let file_bm = this.getBookmarksInFile(fsPath);

        changes.forEach(change => {
            let txt = change.text;
            let range = change.range;
            let num_enter = (txt.match(/\n/g) || []).length;

            let st_line_text = event.document.lineAt(range.start.line).text;
            let st_line_chars = st_line_text.length;
            let st_from_start = st_line_text.slice(0, range.start.character + 1).trim() === '';
            let st_to_end = range.start.character === st_line_chars;
            let st_line_empty = st_line_text.trim() === '';

            let ed_line_text = event.document.lineAt(range.end.line).text;
            let ed_line_chars = ed_line_text.length;
            let ed_from_start = ed_line_text.slice(0, range.end.character + 1).trim() === '';
            let ed_to_end = range.end.character === ed_line_chars;

            if (range.start.line === range.end.line) {
                if (num_enter > 0) {
                    file_bm.forEach(bm => {
                        if (bm.line > range.start.line) {
                            bm.line += num_enter;
                        } else if (bm.line == range.start.line) {
                            // 如果from start就移动 TODO优化一下
                            // if (st_from_start) { bm.line += num_enter; } 
                        }
                    });
                }
            } else {
                if (true) {
                    file_bm.forEach(bm => {
                        if (bm.line > range.start.line && bm.line < range.end.line) {
                            // 处于中间的行删除书签 -- 稳妥删除
                            // 我们无法判断st line ed
                            // 如果 开头 结尾 都不删除，会怎么样？
                            // 假如 两行之间删除，并且两行都有bookmark 那么两个bookmark重叠
                            // 如果第一行有bookmark bm还在第一行
                            // 如果第二行有bm bm转到了第一行
                            // 考虑到alt换行的情况
                            this.deleteBookmark(bm);
                        } else if (bm.line >= range.end.line) {
                            bm.line -= range.end.line - range.start.line + num_enter;
                        }
                        // 检查重叠并且删除
                        let overlaps = this.fake_root_group.cache.findOverlapBookmark();
                        this.deleteBookmarks(
                            overlaps.map(
                                uri => this.fake_root_group.get_node(uri, ITEM_TYPE_BM) as Bookmark
                            )
                        );
                    });
                }
            }
        });
        this.updateDecorations();
        this.saveState();
    }

    public revealBookmark(textEditor: TextEditor) {
        let fspath = textEditor.document.uri.fsPath;
        if (textEditor.selections.length === 1) {
            let selection = textEditor.selections[0];
            let line = selection.start.line;
            this.getBookmarksInFile(fspath).forEach(item => {
                if (item.line === line) {
                    window.showInformationMessage("current bookmark: " + item.get_full_uri());
                    let tvitem = this.fake_root_group.vicache.get(item.get_full_uri());
                    BookmarkTreeViewManager.view.reveal(tvitem, {focus: true});
                }
            });
        }
    }

    public upgradeToGroupBookmark(bm: Bookmark) {
        this.fake_root_group.replace_node(bm, new GroupBookmark(bm));
        this.updateDecorations();
        this.saveState();
    }

    public downgradeToGroup(gbm: GroupBookmark) {
        this.fake_root_group.replace_node(gbm, gbm.toGroup());
        this.updateDecorations();
        this.saveState();
    }
}