import * as vscode from 'vscode';
import {Controller} from './main';
import {BookmarkTreeView} from './bookmark_tree_view';
import {BookmarkTreeItem} from './bookmark_tree_item';
import { Bookmark } from "./functional_types";

export function activate(context: vscode.ExtensionContext) {
	let treeView: BookmarkTreeView = new BookmarkTreeView();
	let main: Controller = new Controller(context, treeView.refreshCallback.bind(treeView));

	// 切换标签的命令
	let disposable;
	disposable = vscode.commands.registerTextEditorCommand('bookmark_x.toggleBookmark', (textEditor) => {
		main.actionToggleBookmark(textEditor);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerTextEditorCommand('bookmark_x.toggleLabeledBookmark', (textEditor) => {
		main.actionToggleLabeledBookmark(textEditor);
	});
	context.subscriptions.push(disposable);

	// 添加分组的命令
	disposable = vscode.commands.registerCommand(
		'bookmark_x.addGroup', () => main.actionAddGroup()
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

	// 通过面板-删除标签
	disposable = vscode.commands.registerCommand(
		'bookmark_x.deleteBookmark', (item: BookmarkTreeItem) => treeView.deleteBookmark(item)
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark_x.jumpToBookmark', (bookmark: Bookmark) => main.jumpToBookmark(bookmark)
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark_x.editBookmarkName', (item: BookmarkTreeItem) => treeView.editBookmarkLabel(item)
	);
	context.subscriptions.push(disposable);

	treeView.init(main);
	let activeEditor = vscode.window.activeTextEditor;

	if (activeEditor) {
		main.updateDecorations();
	}
	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (activeEditor) {
			main.updateDecorations();
		}
	}, null, context.subscriptions);
}

export function deactivate() {}
