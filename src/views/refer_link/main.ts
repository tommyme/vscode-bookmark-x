import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
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
    disposable = vscode.commands.registerCommand("bmx.referLink.swapSelection", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.selections.length === 2) {
        editor.edit(editBuilder => {
          const [firstSelection, secondSelection] = editor.selections;
          const firstText = editor.document.getText(firstSelection);
          const secondText = editor.document.getText(secondSelection);
          editBuilder.replace(firstSelection, secondText);
          editBuilder.replace(secondSelection, firstText);
        });
      } else {
        vscode.window.showInformationMessage("please select two part to swap.");
      }
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand("bmx.referLink.createSnippet", () => {
      const editor = vscode.window.activeTextEditor;
      const homedir = os.homedir();
      let macos_folder = 'Library/Application Support/Code/User/snippets'
      let win_folder = 'AppData\\Roaming\\Code\\User\\snippets'
      if (editor && editor.selections.length === 1) {
        const langId = editor.document.languageId;
        let filename = `${langId}.json`;
        let full_path: string;
        if (os.platform() === "win32") {
          full_path = path.join(homedir, win_folder, filename);
        } else if (os.platform() == "darwin") {
          full_path = path.join(homedir, macos_folder, filename);
        } else {
          return;
        }
        fs.access(full_path, fs.constants.F_OK, async (err) => {
          if (err) {
            vscode.window.showErrorMessage('file not exists, please create it manually');
          } else {
            let jsonData;
            let _data = fs.readFileSync(full_path, {encoding: 'utf8'})
            jsonData = JSON.parse(_data);
            const [firstSelection] = editor.selections;
            const firstText = editor.document.getText(firstSelection);
            let newSnip: { prefix: string, body: string[], description: string } = { // prevent type error
              prefix: '',
              body: [],
              description: '',
            };
            const snipname = await vscode.window.showInputBox({
              placeHolder: 'please input snippet name',
              prompt: 'snippet name'
            });
            if (!snipname || snipname.length === 0) {
              return;
            }
            newSnip.prefix = snipname;
            newSnip.body = firstText.split("\n");
            newSnip.description = `template for ${snipname}`;
            jsonData[snipname] = newSnip;
            let content_to_write = JSON.stringify(jsonData, null, 4);
            fs.writeFileSync(full_path, content_to_write);
          }
        });
      } else {
        vscode.window.showErrorMessage("please select some text to create snippet");
      }
    });
    context.subscriptions.push(disposable);
  }
}