import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { chan } from "../../channel";

class Ctx {
  static aigc: Array<vscode.Uri> = [];
}
export class ReferLinkLauncher {
  static async init(context: vscode.ExtensionContext) {
    let disposable;
    disposable = vscode.commands.registerCommand(
      "bmx.referLink.copyVscodeReferLink",
      () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const position = editor.selection.active;
          const filePath = editor.document.uri.fsPath;
          const content = `vscode://file/${filePath}:${position.line + 1}:${position.character}`;
          vscode.env.clipboard.writeText(content);
          vscode.window.showInformationMessage("copied.");
        } else {
          vscode.window.showInformationMessage("no file is open");
        }
      },
    );
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(
      "bmx.referLink.InsertRandomFlag",
      () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          editor.edit((editBuilder) => {
            editor.selections.forEach((selection, idx) => {
              editBuilder.insert(
                selection.active,
                String.fromCharCode(idx + 97),
              );
            });
          });
        }
      },
    );
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(
      "bmx.referLink.DoubleBackSlash",
      () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const selection = editor.selection;
          const selectedText = editor.document.getText(selection);
          const newContent = selectedText.replace(/\\/g, "\\\\");
          editor.edit((editBuilder) => {
            editBuilder.replace(selection, newContent);
          });
        }
      },
    );
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(
      "bmx.referLink.toLinuxPath",
      () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const selection = editor.selection;
          const selectedText = editor.document.getText(selection);
          // 先把\\换成\, 再把\换成/
          let newContent = selectedText.replace(/\\\\/g, "\\");
          newContent = newContent.replace(/\\/g, "/");
          editor.edit((editBuilder) => {
            editBuilder.replace(selection, newContent);
          });
        }
      },
    );
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(
      "bmx.referLink.toWindowsPath",
      () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const selection = editor.selection;
          const selectedText = editor.document.getText(selection);
          // 把/换成\\
          let newContent = selectedText.replace(/\//g, "\\\\");
          editor.edit((editBuilder) => {
            editBuilder.replace(selection, newContent);
          });
        }
      },
    );
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(
      "bmx.referLink.showHtmlPreview",
      () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const document = editor.document;
          const content = document.getText();
          const panel = vscode.window.createWebviewPanel(
            "html preview",
            "html preview",
            vscode.ViewColumn.One,
            {},
          );
          panel.webview.html = content;
        }
      },
    );
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(
      "bmx.referLink.swapSelection",
      () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.selections.length === 2) {
          editor.edit((editBuilder) => {
            const [firstSelection, secondSelection] = editor.selections;
            const firstText = editor.document.getText(firstSelection);
            const secondText = editor.document.getText(secondSelection);
            editBuilder.replace(firstSelection, secondText);
            editBuilder.replace(secondSelection, firstText);
          });
        } else {
          vscode.window.showInformationMessage(
            "please select two part to swap.",
          );
        }
      },
    );
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(
      "bmx.referLink.createSnippet",
      () => {
        const editor = vscode.window.activeTextEditor;
        const homedir = os.homedir();
        let macos_folder = "Library/Application Support/Code/User/snippets";
        let win_folder = "AppData\\Roaming\\Code\\User\\snippets";
        if (editor && editor.selections.length === 1) {
          const langId = editor.document.languageId;
          let filename = `${langId}.json`;
          let full_path: string;
          if (os.platform() === "win32") {
            full_path = path.join(homedir, win_folder, filename);
          } else if (os.platform() === "darwin") {
            full_path = path.join(homedir, macos_folder, filename);
          } else {
            return;
          }
          chan.appendLine(full_path);
          fs.access(full_path, fs.constants.F_OK, async (err) => {
            if (err) {
              vscode.window.showErrorMessage(
                "file not exists, please create it manually",
              );
            } else {
              let jsonData;
              let _data = fs.readFileSync(full_path, { encoding: "utf8" });
              jsonData = JSON.parse(_data);
              const [firstSelection] = editor.selections;
              const firstText = editor.document.getText(firstSelection);
              if (firstText.length === 0) {
                return;
              }
              let newSnip: {
                prefix: string;
                body: string[];
                description: string;
              } = {
                // prevent type error
                prefix: "",
                body: [],
                description: "",
              };
              const prefix = await vscode.window.showInputBox({
                placeHolder: "please input prefix",
                prompt: "prefix",
              });
              if (!prefix || prefix.length === 0) {
                return;
              }
              const shortDesc = await vscode.window.showInputBox({
                placeHolder: "please input short description",
                prompt: "short description -- key of snippet json",
                value: `bmx: ${prefix}`,
              });
              if (!shortDesc || shortDesc.length === 0) {
                return;
              }
              const description = await vscode.window.showInputBox({
                placeHolder: "please input description",
                prompt: "description",
                value: `template for ${shortDesc}`,
              });
              if (!description || description.length === 0) {
                return;
              }
              newSnip.prefix = prefix;
              newSnip.body = firstText.split("\n");
              newSnip.description = description;
              jsonData[shortDesc] = newSnip;
              let content_to_write = JSON.stringify(jsonData, null, 4);
              fs.writeFileSync(full_path, content_to_write);
            }
          });
        } else {
          vscode.window.showErrorMessage(
            "please select some text to create snippet",
          );
        }
      },
    );
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerTextEditorCommand(
      "bmx.referLink.diffTwo",
      () => {
        let editors = vscode.window.visibleTextEditors;
        if (editors.length === 2) {
          const editor1 = editors[0];
          const editor2 = editors[1];

          const doc1 = editor1.document;
          const doc2 = editor2.document;
          console.log(doc1.uri, doc2.uri);

          vscode.commands.executeCommand(
            "vscode.diff",
            doc1.uri,
            doc2.uri,
            "Diff between two editors",
          );
        } else {
          vscode.window.showInformationMessage(
            "Please open exactly two editors to compare.",
          );
        }
      },
    );
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(
      "bmx.referLink.copyAigcFilesContent",
      async (...commandArgs) => {
        let filesUri: Array<vscode.Uri> = commandArgs[1];
        Ctx.aigc = filesUri;
        await copyUriFilesWithName(Ctx.aigc);
      },
    );
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(
      "bmx.referLink.copyAigcFilesContentLastTime",
      async () => {
        if (Ctx.aigc.length > 0) {
          await copyUriFilesWithName(Ctx.aigc);
        } else {
          vscode.window.showInformationMessage("aigc history empty!");
        }
      },
    );
    context.subscriptions.push(disposable);
  }
}

async function copyUriFilesWithName(filesUri: Array<vscode.Uri>) {
  let result = "";
  for (const uri of filesUri) {
    const content = await vscode.workspace.fs.readFile(uri);
    result += `///// ${path.basename(uri.fsPath)}\n`;
    result += content.toString();
    result += "\n";
  }
  await vscode.env.clipboard.writeText(result);
}
