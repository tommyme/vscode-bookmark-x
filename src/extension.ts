import * as vscode from 'vscode';
import {Main} from './main';

export function activate(context: vscode.ExtensionContext) {
	let main: Main = new Main(context);

	// 切换标签的命令
	let disposable: vscode.Disposable = vscode.commands.registerTextEditorCommand('book-mark-demo.toggleBookmark', (textEditor) => {
		main.editorActionToggleBookmark(textEditor);
	});

	context.subscriptions.push(disposable);

	// 添加分组的命令
	disposable = vscode.commands.registerCommand(
		'book-mark-demo.addGroup', () => main.actionAddGroup()
	);
	context.subscriptions.push(disposable);
}

export function deactivate() {}
