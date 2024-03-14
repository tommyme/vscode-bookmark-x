import * as vscode from 'vscode';
import { ThemeColor, ThemeIcon, ViewBadge } from 'vscode';
import {Controller} from './controller';
import {BookmarkTreeItem} from './bookmark_tree_item';
import { Bookmark, Group } from './functional_types';
import * as util from './util';

class MyViewBadge implements ViewBadge {
    tooltip: string;
    value: number;
    public constructor(value: number=0) {
        this.value = value;
        this.tooltip = `${this.value} bookmarks`;
    }
}

export class BookmarkTreeViewManager {

    static controller: Controller;

    static view: vscode.TreeView<BookmarkTreeItem>;

    static refreshCallback() {
        if (this.controller!.tprovider !== null) {
            this.controller!.tprovider.refresh();
        }
        this.refresh_badge();
    }

    static async init() {
        // this.treeDataProviderByFile = this.controller.getTreeDataProviderByFile();
        // vscode.TreeViewOptions
        if (!this.view) {
            let view = vscode.window.createTreeView<BookmarkTreeItem>('bookmarksByGroup', {
                treeDataProvider: this.controller.tprovider, 
                dragAndDropController: this.controller.tprovider,
                showCollapseAll: true, canSelectMany: true
            });
            view.description = "manage your bookmarks";
            this.view = view;
        }
    }
    static refresh_badge() {
        let num = this.controller!.fake_root_group.cache.bookmark_num();
        this.view.badge = new MyViewBadge(num);
    }

    static activateGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup();
        const activeGroup = this.controller!.activeGroup;
        if (group === null || activeGroup.get_full_uri() === group.get_full_uri()) {
            // switch to root group
            this.controller!.activateGroup("");
            vscode.window.showInformationMessage(`切换至root group`);
            this.controller!.view_item_map.keys().forEach(key => {
                // reset icon status
                let tvi = this.controller!.view_item_map.get(key);
                if (tvi.base?.type === 'group') { tvi.iconPath = new ThemeIcon("folder"); }
            })
        } else {
            this.controller!.activateGroup(group.get_full_uri());
            vscode.window.showInformationMessage(`切换至${group.get_full_uri()}`);
            this.controller!.view_item_map.keys().forEach(key => {
                // reset icon status
                let tvi = this.controller!.view_item_map.get(key);
                if (tvi.base?.type === 'group') {
                    if (util.isSubUriOrEqual(key, group!.get_full_uri())) {
                        tvi.iconPath = new ThemeIcon("folder-opened", new ThemeColor("statusBarItem.remoteBackground"));
                    } else {
                        tvi.iconPath = new ThemeIcon("folder");
                    }
                }
            })
        }
    }

    static deleteGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup();
        this.controller!.deleteGroups(group!);
        vscode.window.showInformationMessage(`删除${group!.get_full_uri()}成功`);
    }

    static deleteBookmark(treeItem: BookmarkTreeItem) {
        const bookmark = treeItem.getBaseBookmark();
        this.controller!.deleteBookmark(bookmark!);
    }

    static addSubGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup()!;
        this.controller!.inputBoxAddGroup().then((name: String) => {
            let uri = util.joinTreeUri([group.get_full_uri(), name]);
            this.controller!.addGroup(uri);
        });
    }

    static editNodeLabel(treeItem: BookmarkTreeItem) {
        const node = treeItem.base;
        if (node) {
            vscode.window.showInputBox({
                placeHolder: '请输入标签文本',
                value: node.name
            }).then((label) => {
                if (label) {
                    if (label === node.name) {
                        vscode.window.showInformationMessage("edit info: label unchanged");
                    } else if (!this.controller!.editNodeLabel(node, label)) {
                        vscode.window.showInformationMessage("edit fail: label exists!");
                    }
                }
                this.controller!.updateDecorations();
            });        
        } else {
            vscode.window.showInformationMessage("node is null");
        }
    }
}