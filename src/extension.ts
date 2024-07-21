import * as vscode from 'vscode';
import { TaskTreeViewManager } from "./views/quick_run/view_manager";
import { bmxLauncher } from './views/bookmark_x/main';
import { ReferLinkLauncher } from './views/refer_link/main';
import * as path from 'path';
import * as fs from 'fs';
import {chan} from './channel';


export async function activate(context: vscode.ExtensionContext) {
	chan.appendLine("activate");
	TaskTreeViewManager.init(context);
	bmxLauncher.init(context);
	ReferLinkLauncher.init(context);
	let disposable = vscode.commands.registerCommand('bmx.showWelcomePage', () => {
		const panel = vscode.window.createWebviewPanel(
			'bmxWelcomePage',
			'Bookmark X upgrade notes',
			vscode.ViewColumn.One,
			{}
		);
		panel.webview.html = getWebviewContent(context.extensionPath);
	});
	context.subscriptions.push(disposable);
	showWelcomePageOnUpdate(context);
}
function showWelcomePageOnUpdate(context: vscode.ExtensionContext) {
	const currentVersion = vscode.extensions.getExtension('tommyme.bookmarkx')?.packageJSON.version;
	const previousVersion = context.globalState.get('extensionVersion');
	chan.appendLine("curr version: " + currentVersion);
	chan.appendLine("prev version: " + previousVersion);
	if (currentVersion !== previousVersion) {
			context.globalState.update('extensionVersion', currentVersion);
			vscode.commands.executeCommand('bmx.showWelcomePage');
	}
}

function getWebviewContent(home: string): string {
	const welcomePath = path.join(home, 'src', 'welcome.html');
	return fs.readFileSync(welcomePath, 'utf-8');
}
export function deactivate() { }
