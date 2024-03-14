import {
    ExtensionContext,
    Range,
    TextEditor,
    TextEditorDecorationType,
    window,
    Uri,
    workspace,
    TextDocumentChangeEvent
} from 'vscode';
import * as path from 'path';
import { Bookmark, NodeUriMap, RootGroup, ViewItemUriMap } from "./functional_types";
import { Group } from './functional_types';
import { SerializableGroup } from './serializable_type';
import * as util from './util';
import { BookmarkTreeDataProvider } from './bookmark_tree_data_provider';
import { TextEncoder } from 'util';
import { DecorationFactory } from './decoration_factory';
import { BookmarkTreeItemFactory } from './bookmark_tree_item';
import { BookmarkTreeViewManager } from './bookmark_tree_view';

export class Controller {
    public readonly savedBookmarksKey = 'bookmarkDemo.bookmarks'; // 缓存标签的key
    public readonly savedRootNodeKey = "bookmarkDemo.root_Node";
    public readonly savedActiveGroupKey = "bookmarkDemo.activeGroup";
    public readonly defaultGroupName = "";

    private ctx: ExtensionContext;
    public activeGroup!: Group;
    private decos2remove = new Map<TextEditorDecorationType, number>();
    public fake_root_group!: RootGroup;
    public node_map!: NodeUriMap;
    public tprovider!: BookmarkTreeDataProvider;
    public _range?: Range;
    public view_item_map!: ViewItemUriMap;

    constructor(ctx: ExtensionContext) {
        console.log("controller init");
        this.ctx = ctx;
        BookmarkTreeItemFactory.controller = this;
        this.tprovider = new BookmarkTreeDataProvider(this);
        // DecorationFactory.svgDir = this.ctx.globalStorageUri; // 缓存地址
        this.restoreSavedState(); // 读取上一次记录的状态 初始化fake root group
        this.init_with_fake_root();
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
            // TODO 针对fspath 不存在的书签 改变其显示样式 显示提示框，是否删除这些失效书签
            this.fake_root_group = SerializableGroup.build_root(rootNodeSerialized) as RootGroup;
        } else {
            this.fake_root_group = new RootGroup("", "", "", []);
        }
        this.activeGroup = this.fake_root_group.get_node(activeGroupUri, 'group') as Group;
    }

    public init_with_fake_root() {
        this.tprovider.root_group = this.fake_root_group;
        this.fake_root_group.cache = this.fake_root_group.bfs_get_nodes();
        this.view_item_map = this.fake_root_group.bfs_get_tvmap();
        this.node_map = this.fake_root_group.cache;
        console.log("node map keys:", this.node_map.keys());
        console.log("view item map keys:", this.view_item_map.keys());
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
                    return;
                }
            } else {
                window.showInformationMessage(`输入的label为空!`);
                return;
            }
        });
    }

    public inputBoxAddGroup() {
        return window.showInputBox({
            placeHolder: "分组名",
            prompt: "请输入新的分组名",
        }).then((groupName) => {
            groupName = groupName?.trim();
            if (!groupName) {
                let err_msg = "empty group name not allowed.";
                window.showInformationMessage(err_msg);
                throw new Error(err_msg);
            } else {
                return groupName;
            }
        });
    }
    public addGroup(uri: string) {
        let new_group = this.createGroupWithUri(uri);
        let res = this.addGroup2Root(new_group);
        if (res) {
            window.showInformationMessage('group: ' + uri + ' 创建成功');
        } else {
            window.showInformationMessage('group: ' + uri + ' 创建失败, exists');
        }
    }
    // 添加新分组
    public actionAddGroup() {
        this.inputBoxAddGroup().then((groupName: String) => {
            let uri = util.joinTreeUri([this.activeGroup.get_full_uri(), groupName]);
            this.addGroup(uri);
        });
    }

    public async actionSaveSerializedRoot() {
        let content: string = JSON.stringify(this.fake_root_group.serialize(), undefined, 2);
        let proj_folder = workspace.workspaceFolders![0].uri.path;
        let uri = Uri.file(
            path.join(proj_folder, '.vscode', 'bookmark_x.json')
        );
        const encoder = new TextEncoder();
        let bytes = encoder.encode(content);
        await workspace.fs.writeFile(uri, bytes);
        window.showInformationMessage("保存完毕");
    }
    public async actionLoadSerializedRoot() {
        let proj_folder = workspace.workspaceFolders![0].uri.path;
        let uri = Uri.file(
            path.join(proj_folder, '.vscode', 'bookmark_x.json')
        );
        await workspace.fs.readFile(uri).then(
            content => {
                let obj = JSON.parse(content.toString());
                // let pre_root_group = this.fake_root_group
                this.fake_root_group = SerializableGroup.build_root(obj);
                this.activeGroup = this.fake_root_group;
                this.init_with_fake_root();
                this.updateDecorations();
                this.saveState();
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
        let group = this.fake_root_group.get_node(bookmark.uri, 'group') as Group;
        let index = group.children.indexOf(bookmark);
        if (index < 0) {
            return;
        }

        group.children.splice(index, 1);
        this.node_map.del(bookmark.get_full_uri());
        this.view_item_map.del(bookmark.get_full_uri());
        this.updateDecorations();
        this.saveState();
    }

    public deleteBookmarks(bms: Array<Bookmark>) {
        bms.forEach(bm => {
            let group = this.fake_root_group.get_node(bm.uri, 'group') as Group;
            let index = group.children.indexOf(bm);
            group.children.splice(index, 1);
            this.node_map.del(bm.get_full_uri());
            this.view_item_map.del(bm.get_full_uri());
        });
        this.updateDecorations();
        this.saveState();
    }

    /**
     * 编辑label 刷新children的uri 如果是group就刷新缓存
     */
    private _editNodeLabel(node: Bookmark | Group, val: string): Group | undefined {
        let father = this.fake_root_group.get_node(node.uri, "group") as Group;

        let index = father.children.indexOf(node);
        if (index < 0) {
            return undefined;
        }
        let original_full_uri = node.get_full_uri();
        father.children[index].name = val;
        let new_full_uri = node.get_full_uri();
        if (node.type == 'group') {
            // bfs edit uri
            (node as Group).bfs_get_nodes().values().forEach(node => {
                node.uri = node.uri.replace(original_full_uri, new_full_uri);    // only replace once
            });
            // refresh cache
            this.node_map = this.fake_root_group.bfs_get_nodes();
            this.view_item_map = this.fake_root_group.bfs_get_tvmap();
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
        if (this.node_map.check_uri_exists(util.joinTreeUri([node.uri, val]))) {
            return false;
        }
        // 前后的缓存操作 用于输入的是bm的场合
        this.node_map.del(node.get_full_uri());
        // change tree view item's label
        let tvitem = this.view_item_map.get(node.get_full_uri());
        tvitem.label = val;

        this.view_item_map.del(node.get_full_uri());
        
        let father = this._editNodeLabel(node, val);
        if (father) {
            father.sortGroupBookmark();
            this.node_map.set(node.get_full_uri(), node);
            this.view_item_map.set(util.joinTreeUri([node.uri, val]), tvitem);
            // this.view_item_map.set(node.)
            this.saveState();
            this.updateDecorations();
            return true;
        } else {
            return false;
        }
    }

    /**
     * 提供给treeView，删除分组
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public deleteGroups(group: Group) {
        const activeGroupDeleted = util.isSubUriOrEqual(group.get_full_uri(), this.activeGroup.get_full_uri());
        let father_group = this.fake_root_group.get_node(group.uri, "group") as Group;
        let idx = father_group.children.indexOf(group);
        if (idx < 0) {
            // TODO tip
            return;
        }
        father_group.children.splice(idx, 1);
        this.node_map.del_group(group.get_full_uri());
        this.view_item_map.del_group(group.get_full_uri());
        if (activeGroupDeleted) {
            // 如果激活组被删除了, 就换一个组设置激活
            this.activateGroup(this.fake_root_group.get_full_uri());
        }

        this.updateDecorations();
        this.saveState();
    }

    public addGroup2Root(group: Group): boolean {

        if (this.node_map.check_uri_exists(group.get_full_uri())) {
            return false;
        }
        this.node_map.set(group.get_full_uri(), group);
        this.view_item_map.set(group.get_full_uri(), BookmarkTreeItemFactory.createGroup(group))
        let father = this.fake_root_group.add_group(group);
        father.sortGroupBookmark();
        this.updateDecorations();
        this.saveState();
        return true;
    }

    public addBookmark(bm: Bookmark): boolean {
        // uri confliction
        if (this.node_map.check_uri_exists(bm.get_full_uri())) {
            return false;
        }
        let group = this.fake_root_group.add_bookmark_recache(bm);
        this.view_item_map.set(
            bm.get_full_uri(), 
            BookmarkTreeItemFactory.createBookmark(bm)
        );
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
        let group = this.fake_root_group.get_node(uri, "group") as Group;
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
        this.node_map.keys().forEach(full_uri => {
            let item = this.node_map.get(full_uri) as Bookmark;
            if (item.type === "bookmark" && ((item.fsPath || null) === fsPath)) { fileBookmarks.push(item); }
        });
        return fileBookmarks;
    }

    /**
     * need to refresh linetext
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public jumpToBookmark(bm: Bookmark) {
        let bookmark = this.fake_root_group.get_node(bm.get_full_uri(), "bookmark") as Bookmark;
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
                let lineText = editor.document.lineAt(bookmark.line).text.trim();
                if (lineText !== bookmark.lineText) {
                    bookmark.lineText = lineText;
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
                        let overlaps = this.node_map.findOverlapBookmark();
                        this.deleteBookmarks(
                            overlaps.map(
                                uri => this.fake_root_group.get_node(uri, "bookmark") as Bookmark
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
                    let tvitem = this.view_item_map.get(item.get_full_uri());
                    BookmarkTreeViewManager.view.reveal(tvitem, {focus: true});
                }
            });
        }
    }
}