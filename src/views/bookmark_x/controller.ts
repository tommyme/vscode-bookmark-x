import {
  ExtensionContext,
  Range,
  TextEditor,
  TextEditorDecorationType,
  window,
  Uri,
  workspace,
  TextDocumentChangeEvent,
  TreeItemCollapsibleState,
} from "vscode";
import * as vscode from "vscode";
import * as path from "path";
import {
  Bookmark,
  GroupBookmark,
  NodeType,
  RootGroup,
} from "./functional_types";
import { Group } from "./functional_types";
import { SerializableGroup } from "./serializable_type";
import {
  ITEM_TYPE_BM,
  ITEM_TYPE_GROUP,
  ITEM_TYPE_GROUP_LIKE,
} from "./constants";
import * as bmutil from "./util";
import * as commonUtil from "../utils/util";
import { typeIsBookmarkLike } from "./constants";
import { BookmarkTreeDataProvider } from "./bookmark_tree_data_provider";
import { TextEncoder } from "util";
import { DecorationFactory } from "./decoration_factory";
import { BookmarkTreeItemFactory } from "./bookmark_tree_item";
import { BookmarkTreeViewManager, TVMsgManager } from "./bookmark_tree_view";
import { error } from "console";
import { SAVED_WSFSDATA_KEY } from "./constants";
import { ctxFixing } from "./ctx";

export class SpaceMap {
  static root_group_map: { [key: string]: RootGroup } = {};
  static active_group_map: { [key: string]: Group } = {};

  static get wsfs() {
    if (vscode.workspace.workspaceFolders) {
      return vscode.workspace.workspaceFolders;
    }
    return [];
  }
  static get rgs() {
    return Object.values(this.root_group_map);
  }
}

type WsfDataSerialiable = {
  rg: { [key: string]: any };
  ag: { [key: string]: any };
};

export class Controller {
  static ctx: ExtensionContext;
  static decos2remove = new Map<TextEditorDecorationType, number>();
  static tprovider: BookmarkTreeDataProvider;
  static _wsf: vscode.WorkspaceFolder;

  static get fake_root_group(): RootGroup {
    return SpaceMap.root_group_map[this.wsf.uri.path];
  }

  static set fake_root_group(val: RootGroup) {
    SpaceMap.root_group_map[this.wsf.uri.path] = val;
  }

  static get_root_group(wsf: vscode.WorkspaceFolder) {
    return SpaceMap.root_group_map[wsf.uri.path];
  }

  get activeGroup(): Group {
    // 根据打开的文件判断wsf
    // 打开的文件没有对应的wsf || 没有打开的文件 使用默认wsf(第0个wsf)
    let wsf;
    if (vscode.window.activeTextEditor) {
      let path = vscode.window.activeTextEditor.document.uri.path;
      wsf = commonUtil.getWsfWithPath(path);
    } else {
      wsf = vscode.workspace.workspaceFolders![0];
    }
    return SpaceMap.active_group_map[wsf!.uri.path];
  }

  static get_active_group(wsf: vscode.WorkspaceFolder): Group {
    return SpaceMap.active_group_map[wsf.uri.path];
  }

  static set activeGroup(group: Group) {
    SpaceMap.active_group_map[this.wsf.uri.path] = group;
  }

  static get wsf(): vscode.WorkspaceFolder {
    let fake_wsf = {
      uri: vscode.Uri.file("/path/to/404"),
      name: "",
      index: -1,
    };
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      return fake_wsf;
    }
    let default_wsf = vscode.workspace.workspaceFolders[0];

    if (!this._wsf) {
      return default_wsf;
    } else {
      return this._wsf;
    }
  }
  static set wsf(val: vscode.WorkspaceFolder) {
    this._wsf = val;
  }

  constructor() {}

  static init(ctx: ExtensionContext) {
    console.log("controller init");
    this.ctx = ctx;
    this.tprovider = new BookmarkTreeDataProvider();
    // DecorationFactory.svgDir = this.ctx.globalStorageUri; // cache
    this.restoreWsfsSavedState();
    this.init_with_fake_root_wsfs();
  }

  // 保存状态 activeGroupName and root group(serialized)
  static saveState() {
    this.saveWsfsState();
  }

  static actionLoadAllWsfState() {
    if (workspace.workspaceFolders) {
      workspace.workspaceFolders.forEach((wsf) => {
        this.doLoadSerializedRoot(wsf);
      });
    }
    this.updateDecorations();
  }

  static actionSaveAllWsfState() {
    if (workspace.workspaceFolders) {
      workspace.workspaceFolders.forEach((wsf) => {
        this.doSaveSerializedRoot(wsf);
      });
    }
  }
  static saveWsfsState() {
    let res: WsfDataSerialiable = { rg: {}, ag: {} };
    workspace.workspaceFolders?.forEach((wsf) => {
      res.rg[wsf.uri.path] = SpaceMap.root_group_map[wsf.uri.path].serialize();
      res.ag[wsf.uri.path] =
        SpaceMap.active_group_map[wsf.uri.path].get_full_uri();
    });
    this.ctx.workspaceState.update(SAVED_WSFSDATA_KEY, res);
    let xx = this.ctx.workspaceState.get(SAVED_WSFSDATA_KEY);
    console.log(xx);
  }
  static restoreWsfsSavedState() {
    if (!workspace.workspaceFolders) {
      return;
    } else {
      // let data = this.ctx.workspaceState.update(SAVED_WSFSDATA_KEY, undefined);
      let data: WsfDataSerialiable = this.ctx.workspaceState.get(
        SAVED_WSFSDATA_KEY,
      ) ?? { rg: {}, ag: {} };
      workspace.workspaceFolders.forEach((wsf) => {
        let rg = data.rg[wsf.uri.path];
        let ag = data.ag[wsf.uri.path];
        if (rg) {
          SpaceMap.root_group_map[wsf.uri.path] = SerializableGroup.buildRoot(
            rg,
          ) as RootGroup;
        } else {
          SpaceMap.root_group_map[wsf.uri.path] = new RootGroup("", "", "", []);
        }
        if (ag) {
          SpaceMap.active_group_map[wsf.uri.path] = SpaceMap.root_group_map[
            wsf.uri.path
          ].get_node(ag as string) as Group;
        } else {
          SpaceMap.active_group_map[wsf.uri.path] =
            SpaceMap.root_group_map[wsf.uri.path];
        }
      });
    }
  }

  static init_with_fake_root_wsfs() {
    vscode.workspace.workspaceFolders?.forEach((wsf) => {
      let rg = SpaceMap.root_group_map[wsf.uri.path];
      rg.cache = rg.bfs_get_nodemap();
      rg.vicache = rg.bfs_get_tvmap();
      rg.sortGroupBookmark();
      console.log("node map keys:", rg.cache.keys());
      console.log("view item map keys:", rg.vicache.keys());
      console.log("restore saved state done");
    });
  }

  /**
   * create a bookmark with random name
   * @param {TextEditor} textEditor - current textEditor you're focusing on
   */
  static actionToggleBookmark(textEditor: TextEditor) {
    if (textEditor.selections.length === 0) {
      return;
    }
    let documentFsPath = textEditor.document.uri.fsPath;
    // 如果能用相对路径就用相对路径 不能就用绝对路径 因为有的是project外的书签
    let wsf = commonUtil.getWsfWithPath(documentFsPath);
    const workspaceRoot = wsf!.uri.fsPath;
    const relativePath = path.relative(workspaceRoot, documentFsPath);
    let documentFsRelPath = relativePath;
    // 可能存在着多个光标
    for (let selection of textEditor.selections) {
      let line = selection.start.line;
      let col = selection.start.character;
      let lineText = textEditor.document.lineAt(line).text.trim();

      this.toggleBookmark(
        documentFsRelPath,
        line,
        col,
        lineText,
        this.get_active_group(wsf!),
      );
    }
  }

  /**
   * create a bookmark with name specified
   * @param {TextEditor} textEditor - current textEditor you're focusing on
   */
  static actionToggleLabeledBookmark(textEditor: TextEditor, force = false) {
    if (textEditor.selections.length === 0) {
      return;
    }

    const fsPath = textEditor.document.uri.fsPath;
    const lineNumber = textEditor.selection.start.line;
    let wsf = commonUtil.getWsfWithPath(fsPath);

    const existingBookmark = this.getBookmarksInFile(fsPath).find(
      (bookmark) => {
        return bookmark.line === lineNumber;
      },
    );

    if (typeof existingBookmark !== "undefined") {
      this.deleteBookmark(existingBookmark);
      return;
    }

    const selectedText = textEditor.document
      .getText(textEditor.selection)
      .trim();
    this.inputBoxGetName(selectedText).then((label) => {
      const characterNumber = textEditor.selection.start.character;
      const lineText = textEditor.document.lineAt(lineNumber).text.trim();

      const bookmark = new Bookmark(
        fsPath,
        lineNumber,
        characterNumber,
        label,
        lineText,
        this.get_active_group(wsf!).get_full_uri(),
      );
      if (!this.addBookmark(bookmark, force)) {
        window.showInformationMessage(
          `Label conflicts with existing bookmarks`,
        );
        return;
      }
    });
  }

  /**
   * @param {string} value - default of input box
   * @returns {PromiseLike<string>} string promise
   */
  static inputBoxGetName(value = "") {
    return window
      .showInputBox({
        placeHolder: "node name",
        prompt: "Please enter a new node name",
        value: value,
      })
      .then((nodeName) => {
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
  static addGroup(uri: string, wsf: vscode.WorkspaceFolder) {
    let new_group = this.createGroupWithUri(uri);
    let res = this.addGroup2Root(new_group, wsf);
    if (res) {
      window.showInformationMessage("group: " + uri + " Created Successfully");
    } else {
      window.showInformationMessage(
        "group: " + uri + " Creation Failed, exists",
      );
    }
  }
  // 添加新分组
  static actionAddGroup() {
    this.inputBoxGetName().then((groupName: string) => {
      // 这里 当前打开的document属于哪个wsf就放到wsf里面
      let wsf = commonUtil.getWsfWithActiveEditor();
      let uri = bmutil.joinTreeUri([
        this.get_active_group(wsf!).get_full_uri(),
        groupName,
      ]);
      this.addGroup(uri, wsf!);
    });
  }

  static async doSaveSerializedRoot(wsf: vscode.WorkspaceFolder | null = null) {
    if (wsf === null) {
      wsf = workspace.workspaceFolders![0];
    }
    let root_group = SpaceMap.root_group_map[wsf.uri.path];
    let content: string = JSON.stringify(root_group.serialize(), undefined, 2);
    let proj_folder = wsf.uri.path;
    let uri = Uri.file(path.join(proj_folder, ".vscode", "bookmark_x.json"));
    const encoder = new TextEncoder();
    let bytes = encoder.encode(content);
    await workspace.fs.writeFile(uri, bytes);
    window.showInformationMessage("saved.");
  }
  static async doLoadSerializedRoot(wsf: vscode.WorkspaceFolder | null = null) {
    if (wsf === null) {
      wsf = workspace.workspaceFolders![0];
    }
    let proj_folder = wsf.uri.path;
    let uri = Uri.file(path.join(proj_folder, ".vscode", "bookmark_x.json"));
    await workspace.fs.readFile(uri).then((content) => {
      let obj = JSON.parse(content.toString());
      SpaceMap.root_group_map[wsf!.uri.path] = SerializableGroup.buildRoot(obj);
      SpaceMap.active_group_map[wsf!.uri.path] = this.get_root_group(wsf!);
    });
    this.init_with_fake_root_wsfs();
    this.updateDecorations();
    this.saveWsfsState();
  }

  static actionClearData() {
    this.ctx.workspaceState.keys().forEach((key) => {
      this.ctx.workspaceState.update(key, undefined);
    });
    this.ctx.workspaceState.update(SAVED_WSFSDATA_KEY, "");
    this.saveWsfsState();
    this.init_with_fake_root_wsfs();
    this.updateDecorations();
    this.saveState();
  }

  // 切换标签
  static toggleBookmark(
    fsPath: string,
    lineNumber: number,
    characterNumber: number,
    lineText: string,
    group: Group,
  ) {
    // TODO 可以添加一个异常情况处理, 处理group 为undefined的时候
    // 获取已存在的标签
    const existingBookmark = this.getBookmarksInFile(fsPath).find(
      (bookmark) => {
        return bookmark.line === lineNumber;
      },
    );

    // 如果已存在标签，就删除
    if (existingBookmark) {
      this.deleteBookmark(existingBookmark);
    } else {
      let bookmark = new Bookmark(
        fsPath,
        lineNumber,
        characterNumber,
        bmutil.randomName(),
        lineText,
        group.get_full_uri(),
      );
      // TODO 需要应对小概率的随机串碰撞
      this.addBookmark(bookmark);
    }
  }

  // 提供给treeView，删除标签
  static deleteBookmark(bookmark: Bookmark) {
    let { rg, fa } = this.get_props(bookmark);
    let index = fa.children.indexOf(bookmark);
    if (index < 0) {
      return;
    }

    fa.children.splice(index, 1);
    rg.cache.del(bookmark.get_full_uri());
    rg.vicache.del(bookmark.get_full_uri());
    this.updateDecorations();
    this.saveState();
  }

  static deleteBookmarks(bms: Array<Bookmark>) {
    bms.forEach((bm) => {
      let { rg, fa } = this.get_props(bm);
      let index = fa.children.indexOf(bm);
      fa.children.splice(index, 1);
      rg.cache.del(bm.get_full_uri());
      rg.vicache.del(bm.get_full_uri());
    });
    this.updateDecorations();
    this.saveState();
  }

  /**
   * 编辑label 刷新children的uri 如果是group就刷新缓存
   */
  static _editNodeLabel(
    node: NodeType,
    val: string,
    wsf: vscode.WorkspaceFolder,
  ): Group | undefined {
    let rg = this.get_root_group(wsf);
    let father = rg.get_node(node.uri) as Group;

    let index = father.children.indexOf(node);
    if (index < 0) {
      return undefined;
    }
    let original_full_uri = node.get_full_uri();
    father.children[index].name = val;
    let new_full_uri = node.get_full_uri();
    if (node.type === ITEM_TYPE_GROUP) {
      // bfs edit uri
      (node as Group)
        .bfs_get_nodemap()
        .values()
        .forEach((node) => {
          node.uri = node.uri.replace(original_full_uri, new_full_uri); // only replace once
        });
      // refresh cache
      rg.cache = rg.bfs_get_nodemap();
      rg.vicache = rg.bfs_get_tvmap();
    }
    return father;
  }

  /**
   * 触发排序
   * @param {type} param1 - param1 desc
   * @returns {type} - return value desc
   */
  static editNodeLabel(node: Bookmark | Group, val: string): boolean {
    let { wsf, rg } = this.get_props(node);
    // check naming confilict
    if (rg.cache.check_uri_exists(bmutil.joinTreeUri([node.uri, val]))) {
      return false;
    }
    rg.cache.del(node.get_full_uri());
    // change tree view item's label
    let tvitem = rg.vicache.get(node.get_full_uri());
    tvitem.label = val;

    rg.vicache.del(node.get_full_uri());

    let father = this._editNodeLabel(node, val, wsf!);
    if (father) {
      father.sortGroupBookmark();
      rg.cache.set(node.get_full_uri(), node);
      rg.vicache.set(bmutil.joinTreeUri([node.uri, val]), tvitem);
      // this.view_item_map.set(node.)
      this.saveState();
      this.updateDecorations();
      return true;
    } else {
      return false;
    }
  }

  static async safeDeleteGroups(group: Group): Promise<boolean> {
    let wsf = this.get_wsf_with_node(group);
    if (group.children.length > 0) {
      let val = await window.showInformationMessage(
        "the group not empty, do you really want to delete it?",
        "yes",
        "no",
      );
      if (val === "yes") {
        this.deleteGroups(group, wsf!);
        return true;
      } else {
        return false;
      }
    } else {
      this.deleteGroups(group, wsf!);
      return true;
    }
  }

  /**
   * 提供给treeView，删除分组
   * @param {type} param1 - param1 desc
   * @returns {type} - return value desc
   */
  static deleteGroups(group: Group, wsf: vscode.WorkspaceFolder) {
    let rg = this.get_root_group(wsf);
    const activeGroupDeleted = bmutil.isSubUriOrEqual(
      group.get_full_uri(),
      this.get_active_group(wsf).get_full_uri(),
    );
    let father_group = rg.get_node(group.uri) as Group;
    let idx = father_group.children.indexOf(group);
    if (idx < 0) {
      // TODO tip
      return;
    }
    father_group.children.splice(idx, 1);
    rg.cache.del_group(group.get_full_uri());
    rg.vicache.del_group(group.get_full_uri());
    if (activeGroupDeleted) {
      // 如果激活组被删除了, 就换一个组设置激活
      this.activateGroup(rg.get_full_uri(), wsf);
      rg.vicache.refresh_active_icon_status(rg.get_full_uri());
    }

    this.updateDecorations();
    this.saveState();
  }

  static addGroup2Root(group: Group, wsf: vscode.WorkspaceFolder): boolean {
    // 判断传入的group属于哪个root group
    let rg = this.get_root_group(wsf);
    if (rg.cache.check_uri_exists(group.get_full_uri())) {
      return false;
    }
    rg.cache.set(group.get_full_uri(), group);
    rg.vicache.set(
      group.get_full_uri(),
      BookmarkTreeItemFactory.createGroup(group),
    );
    let father = rg.add_group(group);
    father.sortGroupBookmark();
    this.updateDecorations();
    this.saveState();
    return true;
  }

  /**
   * @param {Boolean} bm - bookmark to add
   * @param {Boolean} force - delete the exist bm and create new.
   * @returns {Boolean} - success or fail
   */
  static addBookmark(bm: Bookmark, force = false): boolean {
    // uri confliction
    let wsf = commonUtil.getWsfWithPath(bm.fsPath);
    let rg = this.get_root_group(wsf!);
    if (rg.cache.check_uri_exists(bm.get_full_uri())) {
      if (force) {
        let old_bm = rg.get_node(bm.get_full_uri()) as Bookmark;
        this.deleteBookmark(old_bm);
      } else {
        return false;
      }
    }
    let group = rg.add_node_recache_all(bm);
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
  static activateGroup(uri: string, wsf: vscode.WorkspaceFolder) {
    let group = this.get_root_group(wsf).cache.get(uri) as Group;
    if (group === this.get_active_group(wsf)) {
      return;
    }
    SpaceMap.active_group_map[wsf.uri.path] = group;
    this.updateDecorations();
    this.saveState();
  }

  /**
   * 通过uri创建分组
   * @param {type} full_uri - group uri
   * @returns {type} - Group
   */
  static createGroupWithUri(full_uri: string): Group {
    let [group_uri, group_name] = bmutil.splitString(full_uri);
    let group = new Group(group_name, bmutil.randomColor(), group_uri);
    return group;
  }

  /**
   * 更新每个页面的标签
   * @param {type} param1 - param1 desc
   * @returns {type} - return value desc
   */
  static updateDecorations() {
    for (let editor of window.visibleTextEditors) {
      if (typeof editor === "undefined") {
        return;
      }

      let fsPath = editor.document.uri.fsPath;
      let editorDecos = this.getDecoListInFile(fsPath);
      if (editorDecos.size === 0) {
        editor.setDecorations(DecorationFactory.decoration, []);
      }
      // set decos, remove decos
      for (let [, ranges] of editorDecos) {
        editor.setDecorations(DecorationFactory.decoration, ranges);
      }

      this.decos2remove.clear();
    }
    SpaceMap.rgs.forEach((rg) => {
      rg.vicache.entries().forEach(([key, item]) => {
        let node = rg.cache.get(key);
        if (ITEM_TYPE_GROUP_LIKE.includes(node!.type)) {
          if (node!.children.length === 0) {
            // update group state
            item.collapsibleState = TreeItemCollapsibleState.None;
          } else {
            item.collapsibleState = TreeItemCollapsibleState.Expanded;
          }
        }
      });
    });
    BookmarkTreeViewManager.refreshCallback();
  }

  /**
   * 返回editorDecorations
   * @param {type} param1 - param1 desc
   * @returns {type} - return value desc
   */
  static getDecoListInFile(
    fsPath: string,
  ): Map<TextEditorDecorationType, Range[]> {
    const editorDecorations = new Map<TextEditorDecorationType, Range[]>();
    const lineDecorations = new Map<number, TextEditorDecorationType>();

    // 筛选当前页面的标签
    let fileBookmarks = this.getBookmarksInFile(fsPath);

    fileBookmarks.forEach((bookmark) => {
      let decoration = DecorationFactory.decoration;
      if (decoration !== null) {
        lineDecorations.set(bookmark.line, decoration);
      }
    });

    // 基于lineDeco 创建 editorDeco
    for (let [lineNumber, decoration] of lineDecorations) {
      let ranges = editorDecorations.get(decoration);
      if (typeof ranges === "undefined") {
        ranges = new Array<Range>();
        editorDecorations.set(decoration, ranges);
      }
      let myrange = new Range(lineNumber, 0, lineNumber, 0);
      ranges.push(myrange);
    }

    return editorDecorations;
  }

  // 获取已存在的标签
  static getBookmarksInFile(fsPath: string): Array<Bookmark> {
    let fileBookmarks: Array<Bookmark> = [];
    SpaceMap.rgs.forEach((rg) => {
      rg.cache.keys().forEach((full_uri) => {
        let item = rg.cache.get(full_uri) as Bookmark;
        if (item.fsPath === fsPath) {
          fileBookmarks.push(item);
        }
      });
    });
    return fileBookmarks;
  }

  /**
   * need to refresh linetext
   * @param {type} param1 - param1 desc
   * @returns {type} - return value desc
   */
  static jumpToBookmark(bm: Bookmark) {
    window
      .showTextDocument(Uri.file(bm.fsPath), {
        selection: new Range(bm.line, bm.col, bm.line, bm.col),
      })
      .then((editor) => {
        let lineText = editor.document.lineAt(bm.line).text.trim();
        // 考虑2点
        // 前一个没fix 现在这个是 tobefix 前面的变红
        // 前一个没fix 现在这个是 normal  前面的变红
        let need_fresh = ctxFixing.stash();
        if (lineText !== bm.lineText) {
          ctxFixing.startFixBookmark(bm);
          Controller.tryAutoFixBm_finish(bm);
          BookmarkTreeViewManager.refreshCallback();
        } else {
          if (need_fresh) {
            BookmarkTreeViewManager.refreshCallback();
            TVMsgManager.setMsgInit();
          }
          // click on other normal bookmark
          // fixing status changed by gutter's rightclick menu.
          // 上一个是 fixing/normal
          // ctxFixing.finishFixBookmark(); // tvm refresh here
        }
      });
  }

  static documentChangeHandle(event: TextDocumentChangeEvent) {
    let changes = event.contentChanges;
    if (changes.length === 0) {
      return;
    }
    let fsPath = event.document.uri.fsPath;
    // 针对常见场景优化 如单个、多个字符(除了\n)的书写
    let file_bm = this.getBookmarksInFile(fsPath);
    let wsf = commonUtil.getWsfWithPath(fsPath);

    changes.forEach((change) => {
      let txt = change.text;
      let range = change.range;
      let num_enter = (txt.match(/\n/g) || []).length;

      // let st_line_text = event.document.lineAt(range.start.line).text;
      // let st_line_chars = st_line_text.length;
      // let st_from_start = st_line_text.slice(0, range.start.character + 1).trim() === '';
      // let st_to_end = range.start.character === st_line_chars;
      // let st_line_empty = st_line_text.trim() === '';

      // let ed_line_text = event.document.lineAt(range.end.line).text;
      // let ed_line_chars = ed_line_text.length;
      // let ed_from_start = ed_line_text.slice(0, range.end.character + 1).trim() === '';
      // let ed_to_end = range.end.character === ed_line_chars;

      if (range.start.line === range.end.line) {
        if (num_enter > 0) {
          file_bm.forEach((bm) => {
            if (bm.line > range.start.line) {
              bm.line += num_enter;
            } else if (bm.line === range.start.line) {
              // 如果from start就移动 TODO优化一下
              // if (st_from_start) { bm.line += num_enter; }
            }
          });
        }
      } else {
        if (true) {
          file_bm.forEach((bm) => {
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
            let overlaps = this.get_root_group(
              wsf!,
            ).cache.findOverlapBookmark();
            this.deleteBookmarks(
              overlaps.map(
                (uri) =>
                  this.get_root_group(wsf!).get_node(
                    uri,
                    ITEM_TYPE_BM,
                  ) as Bookmark,
              ),
            );
          });
        }
      }
    });
    this.updateDecorations();
    this.saveState();
  }

  static getCurrBookmark(
    line: number,
    fsPath: string,
    callback: (bookmark: Bookmark) => void,
  ) {
    const bookmarks = this.getBookmarksInFile(fsPath);
    for (const item of bookmarks) {
      if (item.line === line) {
        callback(item);
        break;
      }
    }
  }

  static revealBookmark(textEditor: TextEditor) {
    let fspath = textEditor.document.uri.fsPath;
    if (textEditor.selections.length === 1) {
      let selection = textEditor.selections[0];
      let line = selection.start.line;
      this.getCurrBookmark(line, fspath, (item) => {
        window.showInformationMessage(
          "current bookmark: " + item.get_full_uri(),
        );
        let wsf = this.get_wsf_with_node(item);
        let tvitem = this.get_root_group(wsf!).vicache.get(item.get_full_uri());
        BookmarkTreeViewManager.view.reveal(tvitem, { focus: true });
      });
    }
  }

  static upgradeToGroupBookmark(bm: Bookmark) {
    let wsf = this.get_wsf_with_node(bm);
    this.get_root_group(wsf!).replace_node(bm, new GroupBookmark(bm));
    this.updateDecorations();
    this.saveState();
  }

  static downgradeToGroup(gbm: GroupBookmark) {
    let wsf = this.get_wsf_with_node(gbm);
    this.get_root_group(wsf!).replace_node(gbm, gbm.toGroup());
    this.updateDecorations();
    this.saveState();
  }

  static get_wsf_with_node(node: NodeType): vscode.WorkspaceFolder {
    let path: string = "";
    let uri = node.get_full_uri();
    let found = Object.entries(SpaceMap.root_group_map).some(([key, rg]) => {
      if (rg.cache.get(uri) === node) {
        path = key;
        return true;
      }
    });
    if (!found) {
      console.log(new Error().stack);
      throw error("situation error!");
    }
    let res = workspace.workspaceFolders?.find((wsf) => wsf.uri.path === path);
    return res!;
  }

  static async selectBookmark(option: string) {
    let wsf = commonUtil.getWsfWithActiveEditor();

    let cache;
    if (option.includes("root")) {
      cache = this.get_root_group(wsf!).cache;
    } else if (option.includes("active")) {
      cache = this.get_active_group(wsf!).bfs_get_nodemap();
    }

    if (cache === undefined) {
      return;
    }

    let bookmarks = cache
      .values()
      .filter((val) => typeIsBookmarkLike(val.type))
      .map((item) => item.get_full_uri());

    if (bookmarks.length === 0) {
      vscode.window.showInformationMessage("no bookmarks available!");
      return;
    }

    let selectedBmFullUri = await vscode.window.showQuickPick(bookmarks, {
      placeHolder: "Select Bookmark",
      canPickMany: false,
    });

    if (selectedBmFullUri === undefined) {
      return;
    }
    let bm = cache.get(selectedBmFullUri) as Bookmark;
    this.jumpToBookmark(bm);
    return;
  }

  static get_props(node: NodeType) {
    const wsf = this.get_wsf_with_node(node);
    const ag = this.get_active_group(wsf);
    const rg = this.get_root_group(wsf);
    const fa = rg.father_of(node);
    return {
      wsf: wsf,
      ag: ag,
      rg: rg,
      fa: fa,
    };
  }

  static async tryAutoFixBm_finish(bm: Bookmark) {
    let succ = false;
    let uri = Uri.file(bm.fsPath);
    let doc = await vscode.workspace.openTextDocument(uri);
    for (let i = 0; i < doc.lineCount; i++) {
      if (doc.lineAt(i).text === bm.lineText) {
        bm.line = i;
        this.saveState();
        succ = true;
        ctxFixing.finishFixBookmark();
        this.updateDecorations();
        break;
      }
    }
    return succ;
  }
}
