import * as vscode from 'vscode';
export class ReferLinkLauncher {
  static async init(context: vscode.ExtensionContext) {
    let disposable;
    disposable = vscode.commands.registerCommand('bmx.referLink.copyVscodeReferLink', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const position = editor.selection.active;
        const filePath = editor.document.uri.fsPath;
        const content = `vscode://file/${filePath}:${position.line + 1}:${position.character}`;
        vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage('copied.');
      } else {
        vscode.window.showInformationMessage('no file is open');
      }
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('bmx.referLink.InsertRandomFlag', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        editor.edit(editBuilder => {
          editor.selections.forEach((selection, idx) => {
            editBuilder.insert(selection.active, String.fromCharCode(idx + 97));
          });
        });
      }
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand("bmx.referLink.DoubleBackSlash", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        const newContent = selectedText.replace(/\\/g, "\\\\");
        editor.edit(editBuilder => {
          editBuilder.replace(selection, newContent);
        });
      }

    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand("bmx.referLink.toLinuxPath", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        // 先把\\换成\, 再把\换成/
        let newContent = selectedText.replace(/\\\\/g, "\\");
        newContent = newContent.replace(/\\/g, "/");
        editor.edit(editBuilder => {
          editBuilder.replace(selection, newContent);
        });
      }
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand("bmx.referLink.toWindowsPath", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        // 把/换成\\
        let newContent = selectedText.replace(/\//g, "\\\\");
        editor.edit(editBuilder => {
          editBuilder.replace(selection, newContent);
        });
      }
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand("bmx.referLink.showHtmlPreview", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        const content = document.getText();
        const panel = vscode.window.createWebviewPanel(
          "html preview",
          "html preview",
          vscode.ViewColumn.One,
          {}
        );
        panel.webview.html = content;
      };
    });
    context.subscriptions.push(disposable);
  }
}