import * as vscode from 'vscode';
import { ViewBadge } from 'vscode';
import {Controller, SpaceMap, SpaceSortItem} from './controller';
import {BookmarkTreeItem} from './bookmark_tree_item';
import * as commonUtil from '../utils/util';
import * as bmutil from './util';
import { ICON_ACTIVE_GROUP, ICON_BOOKMARK, ICON_GROUP, ICON_SORTING_ACTIVE_GROUP, ICON_SORTING_BOOKMARK, ICON_SORTING_GROUP, typeIsGroupLike, TREEVIEW_ITEM_CTX_TYPE_SORTING_ITEM } from './constants';
import { BmxTreeItem } from './bookmark_tree_data_provider';
import { ITEM_TYPE_BM, ITEM_TYPE_GROUPBM, ITEM_TYPE_GROUP } from './constants';

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
        }
        return;
    }
    
    /**
     * @param {BookmarkTreeItem} tvi - a tree view item
     * @returns {boolean} whether the tvi is using activaed icon
     */
    static tviIconIsActive(tvi: BookmarkTreeItem): boolean {
        if (typeIsGroupLike(tvi.base!.type)) {
            let {ag} = Controller.get_props(tvi.base!);
            return bmutil.isSubUriOrEqual(tvi.base!.get_full_uri(), ag.get_full_uri());
        }
        return false;
    }

    static disableItemSorting(tvi: BookmarkTreeItem) {
        tvi.contextValue = SpaceSortItem.sorting_ctx;
        if (this.tviIconIsActive(tvi)) {
            tvi.iconPath = ICON_ACTIVE_GROUP;
        } else {
            let tp2icon: {[key: string]: vscode.ThemeIcon} = {
                [ITEM_TYPE_GROUP] : ICON_GROUP,
                [ITEM_TYPE_BM] : ICON_BOOKMARK,
                [ITEM_TYPE_GROUPBM] : ICON_GROUP,
            };
            tvi.iconPath = tp2icon[tvi.base!.type];
        }
        SpaceSortItem.sorting_item = undefined;
        SpaceSortItem.sorting_ctx = undefined;
    }

    static enableItemSorting(tvi: BookmarkTreeItem) {
        if (SpaceSortItem.sorting_item !== undefined) {
            this.disableItemSorting(SpaceSortItem.sorting_item);
        }
        let tp2icon: {[key: string]: vscode.ThemeIcon};
        SpaceSortItem.sorting_item = tvi;
        SpaceSortItem.sorting_ctx = tvi.contextValue;
        tvi.contextValue = TREEVIEW_ITEM_CTX_TYPE_SORTING_ITEM;

        if (this.tviIconIsActive(tvi)) {
            tvi.iconPath = ICON_SORTING_ACTIVE_GROUP;
        } else {
            tp2icon = {
                [ITEM_TYPE_GROUP] : ICON_SORTING_GROUP,
                [ITEM_TYPE_BM] : ICON_SORTING_BOOKMARK,
                [ITEM_TYPE_GROUPBM] : ICON_SORTING_GROUP,
            };
            tvi.iconPath = tp2icon[tvi.base!.type];
        }
    }

}

export class BookmarkTreeViewManager {

    static view: vscode.TreeView<BmxTreeItem>;

    static refreshCallback() {
        if (Controller.tprovider !== null) {
            Controller.tprovider.refresh();
        }
        this.refreshBadge();
    }

    static async init() {
        // this.treeDataProviderByFile = Controller.getTreeDataProviderByFile();
        // vscode.TreeViewOptions
        if (!this.view) {
            let view = vscode.window.createTreeView<BmxTreeItem>('bookmarksByGroup', {
                treeDataProvider: Controller.tprovider, 
                dragAndDropController: Controller.tprovider,
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
        let {wsf, rg, ag} = Controller.get_props(group!);
        if (group === null || ag.get_full_uri() === group.get_full_uri()) {
            // switch to root group, reset icon status
            Controller.activateGroup("", wsf!);
            vscode.window.showInformationMessage(`switch to root group`);
            rg.vicache.keys().forEach(key => {
                let tvi = rg.vicache.get(key);
                IconManager.deactivateResetGroupIcon(tvi);
            });
        } else {
            Controller.activateGroup(group.get_full_uri(), wsf!);
            vscode.window.showInformationMessage(`switch to ${group.get_full_uri()}`);
            Controller.get_root_group(wsf!).vicache.refresh_active_icon_status(group!.get_full_uri());
        }
    }

    static selectSortItem(treeItem: BookmarkTreeItem) {
        IconManager.enableItemSorting(treeItem);
        Controller.updateDecorations();
    }

    static deselectSortItem(treeItem: BookmarkTreeItem) {
        IconManager.disableItemSorting(treeItem);
        Controller.updateDecorations();
    }



    static deleteGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup();
        Controller.safeDeleteGroups(group!).then(res => {
            if (res) { vscode.window.showInformationMessage(`delete ${group!.get_full_uri()} successfully`); }
            else { vscode.window.showInformationMessage(`didn't delete`); }
        });
        
    }

    static deleteBookmark(treeItem: BookmarkTreeItem) {
        const bookmark = treeItem.getBaseBookmark();
        Controller.deleteBookmark(bookmark!);
    }

    static addSubGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup()!;
        Controller.inputBoxGetName().then((name: string) => {
            let uri = bmutil.joinTreeUri([group.get_full_uri(), name]);
            let wsf = Controller.get_wsf_with_node(group);
            Controller.addGroup(uri, wsf!);
        });
    }

    static editNodeLabel(treeItem: BookmarkTreeItem) {
        const node = treeItem.base;
        if (node) {
            Controller.inputBoxGetName(node.name).then((label) => {
                if (label === node.name) {
                    vscode.window.showInformationMessage("edit info: label unchanged");
                    return;
                } else if (!Controller.editNodeLabel(node, label)) {
                    vscode.window.showInformationMessage("edit fail: label exists!");
                    return;
                }
                Controller.updateDecorations();
            });
        } else {
            vscode.window.showInformationMessage("node is null");
        }
    }

    static async selectActiveGroup() {
        let wsf = commonUtil.getWsfWithActiveEditor();
        let cache = Controller.get_root_group(wsf!).cache;
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
        Controller.activateGroup(selectedGroupName, wsf!);
        Controller.get_root_group(wsf!).vicache.refresh_active_icon_status(selectedGroupName);
        return;
    }
}
