import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { chan } from "../../channel";
import { exec } from "child_process";
import { getSettingsPath } from "../utils/util";
import { parse } from "jsonc-parser";

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
              try {
                jsonData = parse(_data);
              } catch {
                vscode.window.showErrorMessage("parse json/jsonc file failed");
                console.log(full_path);
                vscode.window.showTextDocument(vscode.Uri.file(full_path));
                return;
              }
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
      "bmx.referLink.setRandomColorForCurrTheme",
      async () => {
        const currentTheme = vscode.workspace
          .getConfiguration("workbench")
          .get<string>("colorTheme", "Default");

        const randomColor = generateRandomColor();

        const settings = await getSettingsPath();
        if (!settings) {
          vscode.window.showErrorMessage("there is no workspace or proj!");
          return;
        } else if (!settings.path) {
          vscode.window.showErrorMessage(
            "please create workspace settings file first.",
          );
          return;
        }

        // read/create settings.json
        let settingsObj: any = {};
        if (fs.existsSync(settings.path)) {
          const settingsContent = fs.readFileSync(settings.path, "utf8");
          try {
            settingsObj = parse(settingsContent);
          } catch (error) {
            vscode.window.showErrorMessage("parse json/jsonc file failed");
            return;
          }
        }

        if (settings.isWS) {
          settingsObj["settings"] ??= {};
          settingsObj["settings"]["workbench.colorCustomizations"] ??= {};
          settingsObj["settings"]["workbench.colorCustomizations"][
            `[${currentTheme}]`
          ] ??= {};
          settingsObj["settings"]["workbench.colorCustomizations"][
            `[${currentTheme}]`
          ]["editor.background"] = randomColor;
        } else {
          settingsObj["workbench.colorCustomizations"] ??= {};
          settingsObj["workbench.colorCustomizations"][`[${currentTheme}]`] ??=
            {};
          settingsObj["workbench.colorCustomizations"][`[${currentTheme}]`][
            "editor.background"
          ] = randomColor;
        }

        // 将更新后的配置写回 settings.json
        const updatedContent = JSON.stringify(settingsObj, null, 2);
        fs.writeFileSync(settings.path, updatedContent, "utf8");

        vscode.window.showInformationMessage(
          `theme "${currentTheme}" bgcolor changed to ${randomColor}`,
        );
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
    disposable = vscode.commands.registerCommand(
      "bmx.referLink.downloadVscodeServerArch",
      () => {
        const shell =
          process.platform === "win32" ? "powershell.exe" : "/bin/bash";
        exec("code --version", { shell }, async (error, stdout, stderr) => {
          console.log(stdout);
          if (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
            return;
          }
          if (stderr) {
            vscode.window.showErrorMessage(`Stderr: ${stderr}`);
            return;
          }
          const commitId = stdout.trim().split("\n")[1];
          const avaliable_archs = ["x64", "arm64"];
          const arch = await vscode.window.showQuickPick(avaliable_archs, {
            placeHolder: "select a arch(default x64)",
          });

          if (!arch) return;
          const url = `https://update.code.visualstudio.com/commit:${commitId}/server-linux-${arch}/stable`;
          vscode.env.openExternal(vscode.Uri.parse(url));
        });
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

// 生成随机颜色
function generateRandomColor(): string {
  let dark_colors = [
    "#000000", //"Black"
    "#2f4f4f", //"Dark Slate Grey"
    "#080808", //"Vampire black"
    "#100c08", //"Smoky Black"
    "#1b1b1b", //"Eerie black"
    "#3d0c02", //"Black Bean"
    "#004242", //"Warm Black"
    "#004040", //"Rich Black"
    "#242124", //"Raisin Black"
    "#253529", //"Black Leather Jacket"
    "#3b3c36", //"Black olive"
    "#52593b", //"Blue Black Crayfish"
    "#704241", //    "Roast Coffee"
    "#674846", //    "Rose Ebony"
    "#555d50", //"Ebony"
    "#555555", //"Davy’s grey"
    "#414a4c", //"Outer Space"
    "#36454f", //"Charcoal"
    "#444c38", //"Rifle Green"
    "#454d32", //"Pine needle color"
    "#483c32", //"Taupe"
    "#264348", //"Japanese Indigo"
    "#353839", //"Onyx"
    "#354230", //"Kombu Green"
    "#43302e", //"Old Burgundy"
    "#32174d", //"Russian Violet"
    "#333333", //"Dark charcoal"
    "#343434", //"Jet"
    "#1c2841", //"Yankees Blue"
    "#3c341f", //"Olive Drab #7"
    "#560319", //"Dark Scarlet"
    "#004953", //"Midnight Green"
    "#3c1414", //"Dark Sienna"
    "#232b2b", //"Charleston Green"
    "#480607", //"Bulgarian Rose"
    "#123524", //"Phthalo Green"
    "#321414", //"Seal Brown"
    "#1a2421", //"Dark Jungle Green"
    "#000036", //"Dark Midnight Blue"
    "#000039", //"Dark Powder Blue"
    "#2c1608", //"Zinnwaldite Brown"
    "#1a1110", //"Licoric"
  ];
  const randomIndex = Math.floor(Math.random() * dark_colors.length);

  return dark_colors[randomIndex];
}
