import * as path from "path";
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
    if (isSubPath(path, wsf.uri.path.slice(1))) {
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

export { isSubPath, getWsfWithPath, getWsfWithActiveEditor, getPathFromEditor };
