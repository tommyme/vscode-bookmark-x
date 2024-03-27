import * as vscode from 'vscode';
import {Controller} from './controller';
import {BookmarkTreeViewManager} from './bookmark_tree_view';
import {BookmarkTreeItem} from './bookmark_tree_item';
import { Bookmark, GroupBookmark } from "./functional_types";
import * as util from './util';
import { DecorationFactory } from './decoration_factory';
import {TaskTreeViewManager} from "./views/quick_run/view_manager";
export async function activate(context: vscode.ExtensionContext) {
	TaskTreeViewManager.init(context);
	DecorationFactory.svgDir = context.globalStorageUri;
	await DecorationFactory.init_svgdir();
	let controller: Controller = new Controller(context);
	BookmarkTreeViewManager.controller = controller;
	BookmarkTreeViewManager.init();
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
		'bookmark_x.activateGroup', (item: BookmarkTreeItem) => BookmarkTreeViewManager.activateGroup(item)
	);
	context.subscriptions.push(disposable);

	// 通过面板-删除分组
	disposable = vscode.commands.registerCommand(
		'bookmark_x.deleteGroup', (item: BookmarkTreeItem) => BookmarkTreeViewManager.deleteGroup(item)
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark_x.editGroupName', (item: BookmarkTreeItem) => BookmarkTreeViewManager.editNodeLabel(item)
	);
	context.subscriptions.push(disposable);

	// 通过面板-删除标签
	disposable = vscode.commands.registerCommand(
		'bookmark_x.deleteBookmark', (item: BookmarkTreeItem) => BookmarkTreeViewManager.deleteBookmark(item)
	);
	context.subscriptions.push(disposable);

	// triggered by clicking bookmark treeitem, jump to bookmark
	disposable = vscode.commands.registerCommand(
		'bookmark_x.jumpToBookmark', (bm: Bookmark) => controller.jumpToBookmark(bm)
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark_x.editBookmarkName', (item: BookmarkTreeItem) => BookmarkTreeViewManager.editNodeLabel(item)
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

	disposable = vscode.commands.registerTextEditorCommand(
		'bookmark_x.revealBookmark', (textEditor) => controller.revealBookmark(textEditor)
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark_x.addSubGroup', (item: BookmarkTreeItem) => BookmarkTreeViewManager.addSubGroup(item)
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark_x.upgradeToGroupBookmark', (item: BookmarkTreeItem) => controller.upgradeToGroupBookmark(item.base! as Bookmark)
	);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand(
		'bookmark_x.downgradeToGroup', (item: BookmarkTreeItem) => controller.downgradeToGroup(item.base! as GroupBookmark)
	);
	context.subscriptions.push(disposable);

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
		controller.documentChangeHandle(e);
	});
	// 删除文件应该删除标签
	vscode.workspace.onDidDeleteFiles(e => {
		let bms2del: Array<Bookmark> = [];
		e.files.forEach(file => {
			let path = file.fsPath;
			let bms = controller.fake_root_group.get_bm_with_under_fspath(path);
			bms2del = bms2del.concat(bms);
		});
		controller.deleteBookmarks(bms2del);
		controller.updateDecorations();
		controller.saveState();
	});
	// 重命名文件应该改一下标签的fspath, 如果是文件夹, 就遍历缓存 然后判断fspath在原来的文件夹下面, 批量更改fspath
	vscode.workspace.onDidRenameFiles(e => {
		e.files.forEach(file => {
			// 不用更新deco
			let old_path = file.oldUri.fsPath;
			let bms = controller.fake_root_group.get_bm_with_under_fspath(old_path);
			vscode.workspace.fs.stat(file.newUri).then(x => {
				if (x.type === vscode.FileType.Directory) {
					bms.forEach(bm => {
						let new_fspath = util.updateChildPath(file.newUri.fsPath, bm.fsPath);
						bm.fsPath = new_fspath;
					});
				} else {
					bms.forEach(bm => { bm.fsPath = file.newUri.fsPath; });
				}
				controller.saveState();
			});
			
		});
	});
}

export function deactivate() {}
