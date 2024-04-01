import * as vscode from 'vscode';
import { ThemeColor, ThemeIcon, ViewBadge } from 'vscode';
import {Controller} from './controller';
import {BookmarkTreeItem} from './bookmark_tree_item';
import { Bookmark, Group } from './functional_types';
import * as util from './util';
import { ITEM_TYPE_GROUP, ITEM_TYPE_GROUP_LIKE } from './constants';

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
        let wsf = this.controller.get_wsf_with_node(group!);
        const activeGroup = this.controller!.get_active_group(wsf!);
        if (group === null || activeGroup.get_full_uri() === group.get_full_uri()) {
            // switch to root group
            this.controller!.activateGroup("", wsf!);
            vscode.window.showInformationMessage(`switch to root group`);
            this.controller!.get_root_group(wsf!).vicache.keys().forEach(key => {
                // reset icon status
                let tvi = this.controller!.get_root_group(wsf!).vicache.get(key);
                if (ITEM_TYPE_GROUP_LIKE.includes(tvi.base!.type)) { tvi.iconPath = new ThemeIcon("folder"); }
            });
        } else {
            this.controller!.activateGroup(group.get_full_uri(), wsf!);
            vscode.window.showInformationMessage(`switch to ${group.get_full_uri()}`);
            this.controller!.get_root_group(wsf!).vicache.refresh_active_icon_status(group!.get_full_uri());
        }
    }

    static deleteGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup();
        this.controller!.safeDeleteGroups(group!).then(res => {
            if (res) { vscode.window.showInformationMessage(`delete ${group!.get_full_uri()} successfully`); }
            else { vscode.window.showInformationMessage(`didn't delete`); }
        })
        
    }

    static deleteBookmark(treeItem: BookmarkTreeItem) {
        const bookmark = treeItem.getBaseBookmark();
        this.controller!.deleteBookmark(bookmark!);
    }

    static addSubGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup()!;
        this.controller!.inputBoxGetName().then((name: String) => {
            let uri = util.joinTreeUri([group.get_full_uri(), name]);
            let wsf = this.controller!.get_wsf_with_node(group);
            this.controller!.addGroup(uri, wsf!);
        });
    }

    static editNodeLabel(treeItem: BookmarkTreeItem) {
        const node = treeItem.base;
        if (node) {
            this.controller!.inputBoxGetName(node.name).then((label) => {
                if (label === node.name) {
                    vscode.window.showInformationMessage("edit info: label unchanged");
                    return;
                } else if (!this.controller!.editNodeLabel(node, label)) {
                    vscode.window.showInformationMessage("edit fail: label exists!");
                    return;
                }
                this.controller!.updateDecorations();
            });
        } else {
            vscode.window.showInformationMessage("node is null");
        }
    }
}