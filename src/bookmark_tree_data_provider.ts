import {EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState} from 'vscode';
import { Bookmark } from "./functional_types";
import {BookmarkTreeItem, BookmarkTreeItemFactory, WsfTreeItem} from './bookmark_tree_item';
import {Group, RootGroup} from './functional_types';
import * as vscode from 'vscode';
import { Controller } from './controller';
import { BookmarkTreeViewManager } from './bookmark_tree_view';
import { ITEM_TYPE_BM, ITEM_TYPE_GROUP, ITEM_TYPE_GROUPBM } from './constants';


export class BookmarkTreeDataProvider implements vscode.TreeDataProvider<BookmarkTreeItem>, vscode.TreeDragAndDropController<BookmarkTreeItem>  {
	dropMimeTypes = ['application/vnd.code.tree.bookmarkitem'];
	dragMimeTypes = ['application/vnd.code.tree.bookmarkitem'];
    public root_group!: RootGroup;
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
            this.controller.wsf = element.wsf;
            el = BookmarkTreeItemFactory.fromGroup(this.root_group as Group);
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
    public async handleDrag(source: BookmarkTreeItem[], treeDataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        let uris2trans = source.map(x => x.base!.get_full_uri());
		treeDataTransfer.set('application/vnd.code.tree.bookmarkitem', new vscode.DataTransferItem(uris2trans));
        console.log("handleDrag", source);
	}
    
    public async handleDrop(target: BookmarkTreeItem | undefined, sources: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        // console.log("handleDrop", target)
        // let x = [target, sources, token]
        const obj = sources.get('application/vnd.code.tree.bookmarkitem');
		const droppingItems: Array<string> = obj?.value;
        let changed_flag = false;

        if (typeof target === 'undefined') {
            target = new BookmarkTreeItem('');
            target.base = this.root_group;
        }
        
        if (droppingItems.length === 1) {
            let full_uri = droppingItems[0];
            let item = this.root_group.cache.get(full_uri);
            if (target && item === target!.base) {
                vscode.window.showInformationMessage("Same source and target!");
                return;
            }
            // group -> root/group
            if ( item instanceof Group && target!.base instanceof Group) {
                if (item.uri === target!.base.get_full_uri()) {
                    vscode.window.showInformationMessage("It's already in the target group!");
                    return;
                }
                // 源group断链
                this.root_group.cut_node(item);
                item.uri = target!.base.get_full_uri();
                // 给目标group添加链接
                target!.base.children.push(item);
                Group.dfsRefreshUri(target!.base);
                this.root_group.cache = this.root_group.bfs_get_nodes();
                this.controller.fake_root_group.vicache = this.root_group.bfs_get_tvmap();
                changed_flag = true;
                target!.base.sortGroupBookmark();
                target!.collapsibleState = TreeItemCollapsibleState.Expanded;
            }
            // bookmark -> root/group
            else if ( item instanceof Bookmark && target!.base instanceof Group) {
                if (item.uri === target.base!.get_full_uri()) {
                    vscode.window.showInformationMessage("the bookmark is already in the target group");
                    return;
                }
                let target_group = target.base as Group;
                this.root_group.mv_bm_recache_all(item, target_group);
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
        let uri = element.base!.uri;
        let bmti = this.controller.fake_root_group.vicache.get(uri);
        return bmti;
    }
}