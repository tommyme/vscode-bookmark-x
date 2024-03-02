import {EventEmitter, TreeDataProvider, TreeItem} from 'vscode';
import { Bookmark } from "./functional_types";
import {BookmarkTreeItem} from './bookmark_tree_item';
import {Group, RootGroup} from './functional_types';
import * as vscode from 'vscode';
import { Controller } from './controller';
import { BookmarkTreeView } from './bookmark_tree_view';


export class BookmarkTreeDataProvider implements vscode.TreeDataProvider<BookmarkTreeItem>, vscode.TreeDragAndDropController<BookmarkTreeItem>  {
	dropMimeTypes = ['application/vnd.code.tree.bookmarkitem'];
	dragMimeTypes = ['application/vnd.code.tree.bookmarkitem'];
    public root_group: RootGroup;
    private changeEmitter = new EventEmitter<BookmarkTreeItem | undefined | null | void>();
    private controller: Controller
    public treeview?: BookmarkTreeView

    readonly onDidChangeTreeData = this.changeEmitter.event;

    constructor(root_group: RootGroup, controller: Controller) {
        this.root_group = root_group
        this.controller = controller
    }

    public getTreeItem(element: BookmarkTreeItem): TreeItem {
        return element;
    }

    // 初始化tree item
    public getChildren(element?: BookmarkTreeItem | undefined): Thenable<any> {
        let el;
        if (!element) {
            el = BookmarkTreeItem.fromGroup(this.root_group as Group, false)
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
            if (item.type === 'group') { return BookmarkTreeItem.fromGroup(item as Group, false) } 
            else if (item.type === 'bookmark') { return BookmarkTreeItem.fromBookmark(item as Bookmark) }
        }) || []
        return Promise.resolve(res)
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
        let uris2trans = source.map(x => x.base!.get_full_uri())
		treeDataTransfer.set('application/vnd.code.tree.bookmarkitem', new vscode.DataTransferItem(uris2trans));
        console.log("handleDrag", source)
	}
    
    public async handleDrop(target: BookmarkTreeItem | undefined, sources: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
        console.log("handleDrop", target)
        let x = [target, sources, token]
        const obj = sources.get('application/vnd.code.tree.bookmarkitem')
		const droppingItems: Array<string> = obj?.value;
        let changed_flag = false;

        if (droppingItems.length === 1) {
            let full_uri = droppingItems[0]
            let item = this.root_group.get_node(full_uri)
            if (target && item == target!.base) {
                vscode.window.showInformationMessage("[x] 源 目标 相同");
                return
            }
            // group -> root
            if ( item instanceof Group && typeof target === 'undefined') {
                if (item.uri === '') {
                    vscode.window.showInformationMessage("已经在root group里了");
                    return
                }
                this.root_group.cut_node(item)
                item.uri = ''
                this.root_group.children.push(item)
                RootGroup.refresh_uri(this.root_group)
                this.root_group.cache_build()
                changed_flag = true
                this.root_group.sortGroupBookmark()
            }
            // group -> group
            else if ( item instanceof Group && target!.base instanceof Group ) {
                if (item.uri === target!.base.get_full_uri()) {
                    vscode.window.showInformationMessage("已经在目标group里了");
                    return
                }
                // 源group断链
                this.root_group.cut_node(item)
                item.uri = target!.base.get_full_uri()
                // 给目标group添加链接
                target!.base.children.push(item)
                RootGroup.refresh_uri(target!.base)
                this.root_group.cache_build()
                changed_flag = true
                target!.base.sortGroupBookmark()
            }
            // bookmark -> root
            else if ( item instanceof Bookmark && typeof target === 'undefined') {
                if (item.uri === '') {
                    vscode.window.showInformationMessage("已经在目标root里了");
                    return
                }
                this.root_group.cut_node_recache(item)
                item.uri = ''
                item.group = this.root_group
                this.root_group.add_bookmark_recache(item)
                changed_flag = true
                this.root_group.sortGroupBookmark()
            }
            // bookmark -> group
            else if ( item instanceof Bookmark && target!.base instanceof Group) {
                if (item.uri === target!.base.get_full_uri()) {
                    vscode.window.showInformationMessage("已经在目标group里了");
                    return
                }
                this.root_group.cut_node_recache(item)
                item.uri = target!.base.get_full_uri()
                item.group = target!.base
                this.root_group.add_bookmark_recache(item)
                changed_flag = true
                target!.base.sortGroupBookmark()
            }
            // ? case not cover
            else { 
                vscode.window.showInformationMessage("该情形暂不支持");
                return
            }
        } else if (droppingItems.length === 0) {
            return
        } else {
            return
        }

        if (changed_flag) {
            this.controller.updateDecorations()
            this.controller.saveState()
        }
	}
}