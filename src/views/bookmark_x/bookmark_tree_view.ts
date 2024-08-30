import * as vscode from 'vscode';
import { ViewBadge } from 'vscode';
import {Controller, SpaceMap, SpaceSortItem} from './controller';
import {BookmarkTreeItem} from './bookmark_tree_item';
import * as commonUtil from '../utils/util';
import * as bmutil from './util';
import { ICON_ACTIVE_GROUP, ICON_BOOKMARK, ICON_GROUP, ICON_SORTING_ACTIVE_GROUP, ICON_SORTING_BOOKMARK, ICON_SORTING_GROUP, typeIsGroupLike } from './constants';
import { BmxTreeItem } from './bookmark_tree_data_provider';

class MyViewBadge implements ViewBadge {
    tooltip: string;
    value: number;
    public constructor(value: number=0) {
        this.value = value;
        this.tooltip = `${this.value} bookmarks`;
    }
}

class IconManager {

    static tviIsSorting(tvi: BookmarkTreeItem): boolean {
        return SpaceSortItem.sorting_item === tvi;
    }

    static deactivateResetGroupIcon(tvi: BookmarkTreeItem) {
        if (typeIsGroupLike(tvi.base!.type)) {
            if (!this.tviIsSorting(tvi)) {
                tvi.iconPath = ICON_GROUP;
            }
        } else {
            throw Error("type is not group like!");
        }
    }
    
    /**
     * @param {BookmarkTreeItem} tvi - a tree view item
     * @returns {boolean} whether the tvi is using activaed icon
     */
    static tviIsActive(tvi: BookmarkTreeItem): boolean {
        // bmutil.isSubUriOrEqual()
        return false;
    }

    static disableItemSorting(tvi: BookmarkTreeItem) {
        tvi.contextValue = SpaceSortItem.sorting_ctx;
        if (this.tviIsActive(tvi)) {
            tvi.iconPath = ICON_ACTIVE_GROUP;
        } else {
            let tp2icon = {
                ITEM_TYPE_GROUP: ICON_GROUP,
                ITEM_TYPE_GROUPBM: ICON_GROUP,
                ITEM_TYPE_BM: ICON_BOOKMARK
            };
        }
        SpaceSortItem.sorting_item = undefined;
        SpaceSortItem.sorting_ctx = undefined;
    }

    static enableItemSorting(tvi: BookmarkTreeItem) {
        if (SpaceSortItem.sorting_item !== undefined) {
            let old_tvi = SpaceSortItem.sorting_item;
            old_tvi.contextValue = SpaceSortItem.sorting_ctx;
            if (this.tviIsActive(tvi)) {
                old_tvi.iconPath = ICON_ACTIVE_GROUP;
            } else {
                let tp2icon = {
                    ITEM_TYPE_GROUP: ICON_GROUP,
                    ITEM_TYPE_GROUPBM: ICON_GROUP,
                    ITEM_TYPE_BM: ICON_BOOKMARK,
                };
            }
        }
        SpaceSortItem.sorting_item = tvi;
        SpaceSortItem.sorting_ctx = tvi.contextValue;
        tvi.contextValue = "sortItem";

        if (this.tviIsActive(tvi)) {
            tvi.iconPath = ICON_SORTING_ACTIVE_GROUP;
        } else {
            let tp2icon = {
                ITEM_TYPE_GROUP: ICON_SORTING_GROUP,
                ITEM_TYPE_GROUPBM: ICON_SORTING_GROUP,
                ITEM_TYPE_BM: ICON_SORTING_BOOKMARK,
            };
        }
    }

}

export class BookmarkTreeViewManager {

    static controller: Controller;

    static view: vscode.TreeView<BmxTreeItem>;

    static refreshCallback() {
        if (this.controller!.tprovider !== null) {
            this.controller!.tprovider.refresh();
        }
        this.refreshBadge();
    }

    static async init() {
        // this.treeDataProviderByFile = this.controller.getTreeDataProviderByFile();
        // vscode.TreeViewOptions
        if (!this.view) {
            let view = vscode.window.createTreeView<BmxTreeItem>('bookmarksByGroup', {
                treeDataProvider: this.controller.tprovider, 
                dragAndDropController: this.controller.tprovider,
                showCollapseAll: true, canSelectMany: true
            });
            view.description = "manage your bookmarks";
            this.view = view;
        }
    }
    static refreshBadge() {
        let num = 0;
        SpaceMap.rgs.forEach(rg => {
            num += rg.cache.bookmark_num();
        });
        this.view.badge = new MyViewBadge(num);
    }

    static activateGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup();
        let wsf = this.controller.get_wsf_with_node(group!);
        let rg = this.controller.get_root_group(wsf!);
        const activeGroup = this.controller!.get_active_group(wsf!);
        if (group === null || activeGroup.get_full_uri() === group.get_full_uri()) {
            // switch to root group, reset icon status
            this.controller!.activateGroup("", wsf!);
            vscode.window.showInformationMessage(`switch to root group`);
            rg.vicache.keys().forEach(key => {
                let tvi = rg.vicache.get(key);
                IconManager.deactivateResetGroupIcon(tvi);
            });
        } else {
            this.controller!.activateGroup(group.get_full_uri(), wsf!);
            vscode.window.showInformationMessage(`switch to ${group.get_full_uri()}`);
            this.controller!.get_root_group(wsf!).vicache.refresh_active_icon_status(group!.get_full_uri());
        }
    }

    static selectSortItem(treeItem: BookmarkTreeItem) {
        IconManager.enableItemSorting(treeItem);
        this.controller!.updateDecorations();
    }

    static deselectSortItem(treeItem: BookmarkTreeItem) {
        IconManager.disableItemSorting(treeItem);
        this.controller!.updateDecorations();
    }



    static deleteGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup();
        this.controller!.safeDeleteGroups(group!).then(res => {
            if (res) { vscode.window.showInformationMessage(`delete ${group!.get_full_uri()} successfully`); }
            else { vscode.window.showInformationMessage(`didn't delete`); }
        });
        
    }

    static deleteBookmark(treeItem: BookmarkTreeItem) {
        const bookmark = treeItem.getBaseBookmark();
        this.controller!.deleteBookmark(bookmark!);
    }

    static addSubGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup()!;
        this.controller!.inputBoxGetName().then((name: string) => {
            let uri = bmutil.joinTreeUri([group.get_full_uri(), name]);
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

    static async selectActiveGroup() {
        let wsf = commonUtil.getWsfWithActiveEditor();
        let cache = this.controller!.get_root_group(wsf!).cache;
        let selectedGroupName: string | undefined = await vscode.window.showQuickPick(
            (() => {
                let options = ["root group"];
                for (const element of cache.keys().slice(1)) {
                    if ((typeIsGroupLike(cache.get(element).type))) {
                        options.push(element);
                    }
                }
                return options;
            })(),
            { placeHolder: 'Select Active Group', canPickMany: false }
        );

        if (selectedGroupName === undefined) { vscode.window.showInformationMessage("active group selection fail: undefined error!"); return; }

        if (selectedGroupName === "root group") {
            selectedGroupName = "";
            vscode.window.showInformationMessage(`switch to root group`);
        } else {
            vscode.window.showInformationMessage(`switch to ` + selectedGroupName);
        }
        this.controller!.activateGroup(selectedGroupName, wsf!);
        this.controller!.get_root_group(wsf!).vicache.refresh_active_icon_status(selectedGroupName);
        return;
    }
}
