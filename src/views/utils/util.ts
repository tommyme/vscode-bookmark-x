import * as path from "path";
import * as fs from "fs";
import { WorkspaceFolder } from "vscode";
import * as vscode from "vscode";

function isSubPath(childPath: string, parentPath: string) {
  const relative = path.relative(parentPath, childPath);
  return (
    relative.length > 0 &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  );
}

function getWsfWithPath(path: string): WorkspaceFolder | null {
  let res = null;
  vscode.workspace.workspaceFolders?.forEach((wsf) => {
    if (isSubPath(path, wsf.uri.fsPath)) {
      res = wsf;
    }
  });
  if (!res) {
    // fallback
    res = vscode.workspace.workspaceFolders![0];
  }
  return res;
}

function getWsfWithActiveEditor() {
  // 根据打开的文件判断wsf
  // 打开的文件没有对应的wsf || 没有打开的文件 使用默认wsf(第0个wsf)
  let wsf;
  if (vscode.window.activeTextEditor) {
    let path = vscode.window.activeTextEditor.document.uri.path;
    wsf = getWsfWithPath(path.slice(1));
  }
  if (!wsf) {
    // fallback
    wsf = vscode.workspace.workspaceFolders![0];
  }
  return wsf;
}

function getPathFromEditor(textEditor: vscode.TextEditor) {
  let documentFsPath = textEditor.document.uri.fsPath;
  let wsf = getWsfWithPath(documentFsPath);
  const wsRoot = wsf!.uri.fsPath;
  const relPath = path.relative(wsRoot, documentFsPath);
  let bmPath;
  if (relPath.startsWith("..")) {
    // outof wsRoot
    bmPath = documentFsPath;
  } else {
    bmPath = relPath;
  }
  return {
    bmPath: bmPath,
    wsf: wsf,
    fsPath: documentFsPath,
  };
}

interface ProjSettings {
  isWS: boolean;
  path: string | null;
}

async function getSettingsPath(): Promise<ProjSettings | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null; // 没有打开的工作区
  }

  let settings: ProjSettings = { isWS: false, path: null };
  // 检查是否是多根工作区
  const workspaceFile = vscode.workspace.workspaceFile;
  if (workspaceFile) {
    settings.isWS = true;
    if (workspaceFile.scheme === "file") {
      settings.path = workspaceFile.fsPath;
    } else if (workspaceFile.scheme === "untitled") {
      settings.path = null;
    }
    return settings;
  }

  // 单个工作区，返回 .vscode/settings.json
  const workspaceFolder = workspaceFolders[0];
  settings.path = path.join(
    workspaceFolder.uri.fsPath,
    ".vscode",
    "settings.json",
  );

  // 如果 .vscode 文件夹不存在，则创建它
  const vscodeFolder = path.dirname(settings.path);
  if (!fs.existsSync(vscodeFolder)) {
    fs.mkdirSync(vscodeFolder, { recursive: true });
  }

  return settings;
}

export {
  isSubPath,
  getWsfWithPath,
  getWsfWithActiveEditor,
  getPathFromEditor,
  getSettingsPath,
};
