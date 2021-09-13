import * as vscode from 'vscode';
import {Main} from './main';
import {BookmarkTreeView} from './bookmark_tree_view';
import {BookmarkTreeItem} from './bookmark_tree_item';
import {Bookmark} from './bookmark';

export function activate(context: vscode.ExtensionContext) {
	let treeView: BookmarkTreeView = new BookmarkTreeView();
	let main: Main = new Main(context, treeView.refreshCallback.bind(treeView));

	// 切换标签的命令
	let disposable: vscode.Disposable = vscode.commands.registerTextEditorCommand('bookmark-plugin.toggleBookmark', (textEditor) => {
		main.editorActionToggleBookmark(textEditor);
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerTextEditorCommand('bookmark-plugin.toggleLabeledBookmark', (textEditor) => {
		main.editorActionToggleLabeledBookmark(textEditor);
	});

	context.subscriptions.push(disposable);

	// 添加分组的命令
	disposable = vscode.commands.registerCommand(
		'bookmark-plugin.addGroup', () => main.actionAddGroup()
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark-plugin.activateGroup', (item: BookmarkTreeItem) => treeView.activateGroup(item)
	);
	context.subscriptions.push(disposable);

	// 通过面板-删除分组
	disposable = vscode.commands.registerCommand(
		'bookmark-plugin.deleteGroup', (item: BookmarkTreeItem) => treeView.deleteGroup(item)
	);
	context.subscriptions.push(disposable);

	// 通过面板-删除标签
	disposable = vscode.commands.registerCommand(
		'bookmark-plugin.deleteBookmark', (item: BookmarkTreeItem) => treeView.deleteBookmark(item)
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark-plugin.jumpToBookmark', (bookmark: Bookmark) => main.jumpToBookmark(bookmark)
	);

	context.subscriptions.push(disposable);

	treeView.init(main);
}

export function deactivate() {}
