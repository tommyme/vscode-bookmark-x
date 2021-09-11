import * as vscode from 'vscode';
import {Main} from './main';

export class BookmarkTreeView {

    private main: Main | null = null;

    private treeDataProviderByGroup: any = null;
    private treeDataProviderByFile: any = null;

    public refreshCallback() {
        if (this.treeDataProviderByGroup !== null) {
            this.treeDataProviderByGroup.refresh();
        }
        if (this.treeDataProviderByFile !== null) {
            this.treeDataProviderByFile.refresh();
        }
    }

    public async init(main: Main) {
        this.main = main;

        this.treeDataProviderByGroup = this.main.getTreeDataProviderByGroup();
        this.treeDataProviderByFile = this.main.getTreeDataProviderByFile();

        vscode.window.createTreeView('bookmarksByGroup', {
            treeDataProvider: this.treeDataProviderByGroup
        });

        vscode.window.createTreeView('bookmarksByFile', {
            treeDataProvider: this.treeDataProviderByFile
        });
    }
}