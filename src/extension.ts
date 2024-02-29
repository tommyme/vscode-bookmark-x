import * as vscode from 'vscode';
import {Controller} from './controller';
import {BookmarkTreeView} from './bookmark_tree_view';
import {BookmarkTreeItem} from './bookmark_tree_item';
import { Bookmark } from "./functional_types";

export function activate(context: vscode.ExtensionContext) {
	let treeView: BookmarkTreeView = new BookmarkTreeView();
	let controller: Controller = new Controller(context, treeView.refreshCallback.bind(treeView));

	// 切换标签的命令
	let disposable;
	disposable = vscode.commands.registerTextEditorCommand('bookmark_x.toggleBookmark', (textEditor) => {
		controller.actionToggleBookmark(textEditor);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerTextEditorCommand('bookmark_x.toggleLabeledBookmark', (textEditor) => {
		controller.actionToggleLabeledBookmark(textEditor);
	});
	context.subscriptions.push(disposable);

	// 添加分组的命令
	disposable = vscode.commands.registerCommand(
		'bookmark_x.addGroup', () => controller.actionAddGroup()
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark_x.activateGroup', (item: BookmarkTreeItem) => treeView.activateGroup(item)
	);
	context.subscriptions.push(disposable);

	// 通过面板-删除分组
	disposable = vscode.commands.registerCommand(
		'bookmark_x.deleteGroup', (item: BookmarkTreeItem) => treeView.deleteGroup(item)
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark_x.editGroupName', (item: BookmarkTreeItem) => treeView.editNodeLabel(item)
	);
	context.subscriptions.push(disposable);

	// 通过面板-删除标签
	disposable = vscode.commands.registerCommand(
		'bookmark_x.deleteBookmark', (item: BookmarkTreeItem) => treeView.deleteBookmark(item)
	);
	context.subscriptions.push(disposable);

	// triggered by clicking bookmark treeitem, jump to bookmark
	disposable = vscode.commands.registerCommand(
		'bookmark_x.jumpToBookmark', (bookmark_uri: string) => controller.jumpToBookmark(bookmark_uri)
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark_x.editBookmarkName', (item: BookmarkTreeItem) => treeView.editNodeLabel(item)
	);
	context.subscriptions.push(disposable);
	
	disposable = vscode.commands.registerCommand(
		'bookmark_x.saveBookmarksInWorkspace', () => controller.actionSaveSerializedRoot()
	);
	context.subscriptions.push(disposable);
	
	disposable = vscode.commands.registerCommand(
		'bookmark_x.clearData', () => controller.actionClearData()
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark_x.loadBookmarksInWorkSpace', () => controller.actionLoadSerializedRoot()
	);
	context.subscriptions.push(disposable);


	treeView.init(controller);
	let activeEditor = vscode.window.activeTextEditor;

	if (activeEditor) {
		controller.updateDecorations();
	}
	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (activeEditor) {
			controller.updateDecorations();
		}
	}, null, context.subscriptions);
	vscode.workspace.onDidChangeTextDocument(e => {
		controller.documentChangeHandle(e)
	})
}

export function deactivate() {}
