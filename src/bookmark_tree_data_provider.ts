import {EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState} from 'vscode';
import { Bookmark } from "./functional_types";
import {BookmarkTreeItem, BookmarkTreeItemFactory, WsfTreeItem} from './bookmark_tree_item';
import {Group, RootGroup} from './functional_types';
import * as vscode from 'vscode';
import { Controller, SpaceMap } from './controller';
import { BookmarkTreeViewManager } from './bookmark_tree_view';
import { ITEM_TYPE_BM, ITEM_TYPE_GROUP, ITEM_TYPE_GROUPBM } from './constants';
import * as util from './util';


export class BookmarkTreeDataProvider implements vscode.TreeDataProvider<BookmarkTreeItem>, vscode.TreeDragAndDropController<BookmarkTreeItem>  {
	dropMimeTypes = ['application/vnd.code.tree.bookmarkitem'];
	dragMimeTypes = ['application/vnd.code.tree.bookmarkitem'];

    private changeEmitter = new EventEmitter<BookmarkTreeItem | undefined | null | void>();
    private controller: Controller;

    readonly onDidChangeTreeData = this.changeEmitter.event;

    constructor(controller: Controller) {
        this.controller = controller;
    }

    public getTreeItem(element: BookmarkTreeItem): TreeItem {
        return element;
    }

    // 初始化tree item
    public getChildren(element?: BookmarkTreeItem | undefined | WsfTreeItem): Thenable<any> {
        console.log("get children call", element);
        let el;
        if (!element) {
            let wsfs = vscode.workspace.workspaceFolders?.map(wsf => new WsfTreeItem(wsf));
            if (wsfs === undefined || wsfs.length === 0) {
                BookmarkTreeViewManager.view.message = "";
            } else {
                BookmarkTreeViewManager.view.message = "∠( ᐛ 」∠)_";  // clear message and show welcome
            }
            return Promise.resolve(wsfs);
        } else if (element instanceof WsfTreeItem) {
            el = BookmarkTreeItemFactory.fromType(this.controller.get_root_group(element.wsf) as Group);
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
        const res = el.base!.children?.map(item => {
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
    public async handleDrag(source: WsfTreeItem[]|BookmarkTreeItem[], treeDataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        if (!source.every(item => item instanceof BookmarkTreeItem)) {
            // 这里保证在拖拽workspace的时候 dropping items为空
            return;
        }
        // let uris2trans = source.map(x => x.base!.get_full_uri());
		treeDataTransfer.set('application/vnd.code.tree.bookmarkitem', new vscode.DataTransferItem(source));
        console.log("handleDrag", source);
	}
    
    public async handleDrop(target: WsfTreeItem | BookmarkTreeItem | undefined, sources: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        // console.log("handleDrop", target)
        // let x = [target, sources, token]
        const obj = sources.get('application/vnd.code.tree.bookmarkitem');
		const droppingItems: Array<BookmarkTreeItem> = obj?.value;
        let changed_flag = false;

        if (typeof target === 'undefined') {
            vscode.window.showInformationMessage("that situation not support yet");
            return;
            // target = new BookmarkTreeItem('');
        }
        
        if (droppingItems.length === 1) {
            let tvitem = droppingItems[0];
            let src_wsf = this.controller.get_wsf_with_node(tvitem.base!);
            let item = tvitem.base;
            let src_rg = this.controller.get_root_group(src_wsf!);
            let dst_rg = src_rg;
            if (target instanceof WsfTreeItem) {
                // item.
                let dst_wsf = target.wsf;
                dst_rg = this.controller.get_root_group(target.wsf);
                target = new BookmarkTreeItem("");
                target.base = this.controller.get_root_group(dst_wsf);
            }
            if (target && item === target!.base) {
                vscode.window.showInformationMessage("Same source and target!");
                return;
            }
            // group -> root/group
            if ( item instanceof Group && target!.base instanceof Group) {
                if (dst_rg.cache.get(
                    util.joinTreeUri([target.base.get_full_uri(), item.name])
                )) {
                    vscode.window.showInformationMessage("It's already in the target group!");
                    return;
                }
                // 源group断链
                src_rg.cut_node(item);
                item.uri = target!.base.get_full_uri();
                // 给目标group添加链接
                target!.base.children.push(item);
                Group.dfsRefreshUri(target!.base);
                src_rg.cache = src_rg.bfs_get_nodes();
                src_rg.vicache = src_rg.bfs_get_tvmap();
                if (dst_rg != src_rg) {
                    dst_rg.cache = dst_rg.bfs_get_nodes();
                    dst_rg.vicache = dst_rg.bfs_get_tvmap();
                }
                changed_flag = true;
                target!.base.sortGroupBookmark();
                target!.collapsibleState = TreeItemCollapsibleState.Expanded;
            }
            // bookmark -> root/group
            else if ( item instanceof Bookmark && target!.base instanceof Group) {
                // 判定是否存在
                if (dst_rg.cache.get(
                    util.joinTreeUri([target.base.get_full_uri(), item.name])
                )) {
                    vscode.window.showInformationMessage("the bookmark is already in the target group");
                    return;
                }
                let target_group = target.base as Group;
                if (src_rg === dst_rg) {
                    src_rg.mv_bm_recache_all(item, target_group);
                } else {
                    let old_key = item.get_full_uri();
                    src_rg.cut_node_recache(item);
                    src_rg.vicache.del(old_key);
                    item.uri = target_group.get_full_uri();
                    dst_rg.add_node_recache_all(item);
                }
                changed_flag = true;
                target_group.sortGroupBookmark();
                target!.collapsibleState = TreeItemCollapsibleState.Expanded;
            }
            // ? case not cover
            else { 
                vscode.window.showInformationMessage("that situation not support yet");
                return;
            }
        } else if (droppingItems.length === 0) {
            return;
        } else {
            if (target instanceof WsfTreeItem) {
                // item.
                return;
            }
            return;
            // bookmarks to group
            const all_bookmark = droppingItems.every(full_uri => this.root_group.cache.get(full_uri).type === ITEM_TYPE_BM);
            if (all_bookmark && target!.base instanceof Group) {
                let target_group = target.base as Group;
                droppingItems.forEach(full_uri => {
                    let bm = this.root_group.cache.get(full_uri) as Bookmark;
                    this.root_group.mv_bm_recache_all(bm, target_group);
                });
                changed_flag = true;
                target_group.sortGroupBookmark();
                target.collapsibleState = TreeItemCollapsibleState.Expanded;
            } else {
                vscode.window.showErrorMessage("drop items contain group is not supported at the moment");
            }
            // items contain group
        }

        if (changed_flag) {
            this.controller.updateDecorations();
            this.controller.saveState();
        }
	}
    /**
     * getParent
     */
    public getParent(element: BookmarkTreeItem): BookmarkTreeItem {
        let wsf = this.controller.get_wsf_with_node(element.base!)
        let uri = element.base!.uri;
        let bmti = this.controller.get_root_group(wsf!).vicache.get(uri);
        return bmti;
    }
}