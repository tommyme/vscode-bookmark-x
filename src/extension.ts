import * as vscode from 'vscode';
import { TaskTreeViewManager } from "./views/quick_run/view_manager";
import { bmxLauncher } from './views/bookmark_x/main';
export async function activate(context: vscode.ExtensionContext) {
	TaskTreeViewManager.init(context);
	bmxLauncher.init(context);
}

export function deactivate() { }
