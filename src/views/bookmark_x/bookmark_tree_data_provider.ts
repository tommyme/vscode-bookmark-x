import { EventEmitter, TreeItem, TreeItemCollapsibleState } from "vscode";
import { Bookmark, NodeType, RootGroup } from "./functional_types";
import {
  BookmarkTreeItem,
  BookmarkTreeItemFactory,
  WsfTreeItem,
} from "./bookmark_tree_item";
import { Group } from "./functional_types";
import * as vscode from "vscode";
import { Controller, SpaceMap, SpaceSortItem } from "./controller";
import { BookmarkTreeViewManager } from "./bookmark_tree_view";
import * as util from "./util";
import { ResourceManager } from "./resource_manager";

export type BmxTreeItem = BookmarkTreeItem | WsfTreeItem;

export class BookmarkTreeDataProvider
  implements
    vscode.TreeDataProvider<BmxTreeItem>,
    vscode.TreeDragAndDropController<BmxTreeItem>
{
  dropMimeTypes = ["application/vnd.code.tree.bookmarkitem"];
  dragMimeTypes = ["application/vnd.code.tree.bookmarkitem"];

  private changeEmitter = new EventEmitter<
    BookmarkTreeItem | undefined | null | void
  >();

  readonly onDidChangeTreeData = this.changeEmitter.event;

  constructor() {}

  public getTreeItem(element: BookmarkTreeItem): TreeItem {
    return element;
  }

  // 初始化tree item
  public getChildren(
    element?: BookmarkTreeItem | undefined | WsfTreeItem,
  ): Promise<BmxTreeItem[] | undefined> {
    console.log("get children call", element);
    let el;
    if (!element) {
      let wsfs = vscode.workspace.workspaceFolders?.map(
        (wsf) => new WsfTreeItem(wsf),
      );
      if (wsfs === undefined || wsfs.length === 0) {
        BookmarkTreeViewManager.view.message = "";
      } else {
        BookmarkTreeViewManager.init_view_message(); // clear message and show welcome
      }
      return Promise.resolve(wsfs);
    } else if (element instanceof WsfTreeItem) {
      el = BookmarkTreeItemFactory.fromType(
        Controller.get_root_group(element.wsf) as Group,
      );
    } else {
      el = element;
    }
    return this.renderNode(el);
  }

  /**
   * render all types of nodes
   * @param {type} el - some TreeItem
   * @returns {type} - Promise.resolve(...)
   */
  private renderNode(el: BookmarkTreeItem) {
    // if no children in base, resolve []
    const res =
      el.base!.children?.map((item) => {
        return BookmarkTreeItemFactory.fromType(item);
      }) || [];
    return Promise.resolve(res);
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
  public async handleDrag(
    source: BmxTreeItem[],
    treeDataTransfer: vscode.DataTransfer,
  ): Promise<void> {
    if (!source.every((item) => item instanceof BookmarkTreeItem)) {
      // make sure when dragging workspace dropping items is empty
      return;
    }
    // let uris2trans = source.map(x => x.base!.get_full_uri());
    treeDataTransfer.set(
      "application/vnd.code.tree.bookmarkitem",
      new vscode.DataTransferItem(source),
    );
    console.log("handleDrag", source);
  }

  public async handleDrop(
    target: WsfTreeItem | BookmarkTreeItem | undefined,
    sources: vscode.DataTransfer,
  ): Promise<void> {
    const obj = sources.get("application/vnd.code.tree.bookmarkitem");
    const droppingItems: Array<BookmarkTreeItem> = obj?.value;
    let changed_flag = false;

    if (droppingItems.length === 1) {
      let handler = new DropHandler(droppingItems, target);
      changed_flag = handler.handle();
    } else if (droppingItems.length === 0) {
      return;
    } else {
      if (target instanceof WsfTreeItem) {
        // wsf tvi can't be dropped.
        return;
      }
      return;
    }

    if (changed_flag) {
      Controller.updateDecorations();
      Controller.saveState();
    }
  }
  /**
   * getParent
   */
  public getParent(element: BookmarkTreeItem): BookmarkTreeItem {
    let wsf = Controller.get_wsf_with_node(element.base!);
    let uri = element.base!.uri;
    let bmti = Controller.get_root_group(wsf!).vicache.get(uri);
    return bmti;
  }
}

class DropFlags {
  Move_To_Undefined: boolean;
  Move_To_WsfTreeItem: boolean;
  Node_To_Bookmark: boolean;
  Move_To_Group: boolean;
  Move_To_NodeType: boolean;
  Dst_Src_Same: boolean;
  Group_To_Group: boolean;
  Bookmark_To_Group: boolean;
  Is_Sorting: boolean;
  Same_Name_Node_In_Target: boolean;
  Src_Is_ActiveGroup: boolean;
  Bookmark_To_NodeType: boolean;
  Group_To_NodeType: boolean;
  constructor(handler: DropHandler) {
    let item = handler.tvitem.base;
    this.Move_To_Undefined = typeof handler.target === "undefined";
    this.Move_To_WsfTreeItem = handler.target instanceof WsfTreeItem;
    // here, if target instanceof WsfTreeItem return false. use tricks to avoid check error.
    // if you have better tricks, please make a pr ^_^.
    handler.target = handler.target as BookmarkTreeItem;
    this.Node_To_Bookmark = handler.target.base instanceof Bookmark;
    this.Move_To_Group = handler.target.base instanceof Group;
    this.Move_To_NodeType = this.Move_To_Group || this.Node_To_Bookmark;

    this.Dst_Src_Same = handler.target! && item === handler.target.base!;

    this.Group_To_Group = item instanceof Group && this.Move_To_Group;
    this.Bookmark_To_Group = item instanceof Bookmark && this.Move_To_Group;
    this.Is_Sorting = SpaceSortItem.sorting === true;
    this.Same_Name_Node_In_Target =
      handler.dst_rg.cache.get(
        util.joinTreeUri([
          handler.target.base!.get_full_uri(),
          handler.item.name,
        ]),
      ) !== undefined;
    this.Src_Is_ActiveGroup =
      Controller.get_active_group(handler.src_wsf!) === handler.item;
    this.Bookmark_To_NodeType =
      item instanceof Bookmark && this.Move_To_NodeType;
    this.Group_To_NodeType = item instanceof Group && this.Move_To_NodeType;
  }
}

class DropHandler {
  src_wsf: vscode.WorkspaceFolder;
  dst_wsf: vscode.WorkspaceFolder | null = null;
  src_rg: RootGroup;
  dst_rg: RootGroup;
  item: NodeType;
  tvitem: BookmarkTreeItem;
  target: WsfTreeItem | BookmarkTreeItem | undefined;
  flags: DropFlags;

  constructor(
    dropping: Array<BookmarkTreeItem>,
    target: WsfTreeItem | BookmarkTreeItem | undefined,
  ) {
    this.tvitem = dropping[0];
    this.item = this.tvitem.base!;
    this.src_wsf = Controller.get_wsf_with_node(this.item);
    this.src_rg = Controller.get_root_group(this.src_wsf!);
    this.dst_rg = this.src_rg;
    this.target = target;
    this.flags = new DropFlags(this);
  }
  public preprocess() {
    if (this.flags.Move_To_Undefined) {
      // move to it's wsf, monitor a target node for root group
      this.dst_wsf = this.src_wsf;
      this.dst_rg = Controller.get_root_group(this.src_wsf);
      this.target = new BookmarkTreeItem("");
      this.target.base = Controller.get_root_group(this.dst_wsf);
    } else if (this.flags.Move_To_WsfTreeItem) {
      // monitor a this.target node for root group
      this.dst_wsf = (this.target as WsfTreeItem).wsf;
      this.dst_rg = Controller.get_root_group((this.target as WsfTreeItem).wsf);
      this.target = new BookmarkTreeItem("");
      this.target.base = Controller.get_root_group(this.dst_wsf);
    } else if (this.flags.Move_To_NodeType) {
      this.target = this.target! as BookmarkTreeItem;
      this.dst_wsf = Controller.get_wsf_with_node(this.target.base!);
      this.dst_rg = Controller.get_root_group(this.dst_wsf);
    }
  }
  public handle(): boolean {
    if (this.flags.Dst_Src_Same) {
      vscode.window.showInformationMessage("Same source and this.target!");
      return false;
    }
    this.preprocess(); // process (undefined_target case, WsfTreeItem case)

    // from now on, type ensured.
    this.target = this.target! as BookmarkTreeItem;
    this.target.base = this.target.base! as NodeType;

    if (this.flags.Same_Name_Node_In_Target) {
      vscode.window.showInformationMessage("It's already in the target group!");
      return false;
    }

    if (this.flags.Is_Sorting) {
      let tgnode = (this.target as BookmarkTreeItem).base!;
      let fa_dst = Controller.get_props(tgnode).fa;
      let index_dst = fa_dst.children.indexOf(tgnode);
      let fa_src = Controller.get_props(this.item).fa;
      // calc new_index for different case

      // by default, we think src and dst from diff father
      let index_src = fa_src.children.indexOf(this.item);
      let new_index = index_dst + 1; // insert after that el
      if (fa_src === fa_dst && index_src < index_dst) {
        // same father
        new_index = index_dst;
        // a b c, [b] -> [c] => a c b
        // a b c, [c] -> [b] => a c b
      }
      let strategy = new util.AddElInsertStrategy(new_index);
      if (this.flags.Bookmark_To_NodeType || this.flags.Group_To_NodeType) {
        ResourceManager.mvnode2group(
          this.item,
          this.src_rg,
          fa_dst,
          this.dst_rg,
          strategy,
        );
        return true;
      }
    } else {
      if (this.flags.Group_To_Group) {
        this.target.base = this.target.base! as Group;

        this.src_wsf = this.src_wsf!;
        this.dst_wsf = this.dst_wsf!;

        // 源group断链
        this.src_rg.cut_node(this.item);
        this.item.uri = this.target.base.get_full_uri();
        // 给目标group添加链接
        this.target.base.children.push(this.item);
        Group.dfsRefreshUri(this.target.base);

        // 跨区 而且是 active group
        if (this.src_rg !== this.dst_rg && this.flags.Src_Is_ActiveGroup) {
          // active group refresh
          SpaceMap.active_group_map[this.src_wsf.uri.path] =
            Controller.get_root_group(this.src_wsf);
          SpaceMap.active_group_map[this.dst_wsf.uri.path] = this.item as Group;
        }

        this.src_rg.cache = this.src_rg.bfs_get_nodemap();
        // 通过 bfs tvmap 刷新状态
        this.src_rg.vicache = this.src_rg.bfs_get_tvmap();
        if (this.dst_rg !== this.src_rg) {
          this.dst_rg.cache = this.dst_rg.bfs_get_nodemap();
          this.dst_rg.vicache = this.dst_rg.bfs_get_tvmap();
        }
        this.target.base.sortGroupBookmark();
        this.target.collapsibleState = TreeItemCollapsibleState.Expanded;
        return true;
      } else if (this.flags.Bookmark_To_Group) {
        let target_group = this.target.base as Group;
        ResourceManager.mvbm2group(
          this.item,
          this.src_rg,
          target_group,
          this.dst_rg,
        );
        target_group.sortGroupBookmark();
        this.target.collapsibleState = TreeItemCollapsibleState.Expanded;
        return true;
      }
    }
    vscode.window.showInformationMessage("that situation not support yet");
    return false;
  }
}
