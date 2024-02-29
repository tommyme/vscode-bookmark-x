import * as vscode from 'vscode';
import {Controller} from './controller';
import {BookmarkTreeItem} from './bookmark_tree_item';
import { Bookmark, Group } from './functional_types';

export class BookmarkTreeView {

    private controller: Controller | null = null;

    private treeDataProviderByGroup: any = null;
    private treeDataProviderByFile: any = null;

    public refreshCallback() {
        if (this.treeDataProviderByGroup !== null) {
            this.treeDataProviderByGroup.refresh();
        }
    }

    public async init(controller: Controller) {
        this.controller = controller;

        this.treeDataProviderByGroup = this.controller.tprovider;
        this.controller.tprovider.treeview = this
        // this.treeDataProviderByFile = this.controller.getTreeDataProviderByFile();

        vscode.window.createTreeView('bookmarksByGroup', {
            treeDataProvider: this.treeDataProviderByGroup, 
            dragAndDropController: this.treeDataProviderByGroup,
            showCollapseAll: true, canSelectMany: true
        });
    }

    public activateGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup();
        const activeGroup = this.controller!.activeGroup;
        if (group === null || activeGroup.get_full_uri() === group.get_full_uri()) {
            // switch to root group
            this.controller!.activateGroup("")
            vscode.window.showInformationMessage(`切换至root group`);
            return;
        }
        vscode.window.showInformationMessage(`切换至${group.get_full_uri()}`);
        this.controller!.activateGroup(group.get_full_uri());
    }

    public deleteGroup(treeItem: BookmarkTreeItem) {
        const group = treeItem.getBaseGroup();
        this.controller!.deleteGroups(group!);
        vscode.window.showInformationMessage(`删除${group!.get_full_uri()}成功`);
    }

    public deleteBookmark(treeItem: BookmarkTreeItem) {
        const bookmark = treeItem.getBaseBookmark();
        this.controller!.deleteBookmark(bookmark!);
    }

    public editNodeLabel(treeItem: BookmarkTreeItem) {
        const node = treeItem.base
        if (node) {
            vscode.window.showInputBox({
                placeHolder: '请输入标签文本',
                value: node.name
            }).then((label) => {
                if (label) {
                    if (!this.controller!.editNodeLabel(node, label)) {
                        vscode.window.showInformationMessage("edit fail: label exists!")
                    }
                }
                this.controller!.updateDecorations();
            });        
        } else {
            vscode.window.showInformationMessage("node is null")
        }
    }
}