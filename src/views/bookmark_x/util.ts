import * as path from 'path';
import { WorkspaceFolder } from 'vscode';
import * as vscode from 'vscode';
/**
 * 返回随机颜色
 */
function randomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

/**
 * e.g. "a/b/c" -> ["a/b", "c"]
 * @param {type} param1 - param1 desc
 * @returns {type} - return value desc
 */
function splitTreeUri2parts(input: string): [string, string] {
    const lastIndex = input.lastIndexOf('/');

    if (lastIndex !== -1) {
        const firstPart = input.slice(0, lastIndex);
        const secondPart = input.slice(lastIndex + 1);
        return [firstPart, secondPart];
    } else {
        return ["", input];
    }
}

function joinTreeUri(input: Array<String>): string {
    // "", "aa" -- "aa"
    // "aa", "bb" -- "aa/bb"
    // "", "aa/bb" -- "aa/bb"
    if (input[0] === "") {
        return input.splice(1).join("/");
    } else {
        return input.join("/");
    }
}

function isPathAEqUnderPathB(pathA: string, pathB: string) {
    if (pathA === pathB) {
        return true;
    }
    // 将路径转换为规范化的形式
    pathA = path.normalize(pathA);
    pathB = path.normalize(pathB);

    // 获取路径片段数组
    const childSegments = pathA.split(path.sep);
    const parentSegments = pathB.split(path.sep);

    // 判断子路径是否在父路径下
    if (childSegments.length >= parentSegments.length) {
        let isSubPath = true;
        for (let i = 0; i < parentSegments.length; i++) {
            if (childSegments[i] !== parentSegments[i]) {
                isSubPath = false;
                break;
            }
        }
        return isSubPath;
    }

    return false;
}

function isSubUriOrEqual(parent: string, son: string) {
    if (son === parent || son.startsWith(parent + "/")) {
        return true;
    }
    return false;
}

function updateChildPath(parentPath: string, childPath: string) {
    // 获取相对路径
    let relativePath = path.relative(parentPath, childPath);
    let splited = relativePath.split(path.sep);
    splited.splice(1, 1);
    // 拼接新的孩子路径
    let updatedChildPath = path.join(parentPath, path.basename(relativePath), splited.join(path.sep));
    return updatedChildPath;
}

function randomName(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function isSubPath(childPath: string, parentPath: string) {
    const relative = path.relative(parentPath, childPath);
    return (relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function getWsfWithPath(path: string): WorkspaceFolder | null {
    let res = null;
    vscode.workspace.workspaceFolders?.forEach(wsf => {
        if (isSubPath(path, wsf.uri.path.slice(1))) {
            res = wsf;
        }
    });
    if (!res) { // fallback
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
    if (!wsf) { // fallback
        wsf = vscode.workspace.workspaceFolders![0];
    }
    return wsf;
}

function wsfGetBookmarkJsonUri(wsf: WorkspaceFolder): vscode.Uri {
    let uri = vscode.Uri.file(
        path.join(wsf.uri.path, '.vscode', 'bookmark_x.json')
    );
    return uri;
}

async function wsfReadBookmarkJson(wsf: WorkspaceFolder): Promise<Object | null> {
    let uri = wsfGetBookmarkJsonUri(wsf);
    let result = null;
    await vscode.workspace.fs.stat(uri).then(
        async () => {
            await vscode.workspace.fs.readFile(uri).then(content => {
                let obj = JSON.parse(content.toString());
                result = obj
            });
        },
        () => {}
    );
    return result;
}

export {
    randomColor,
    splitTreeUri2parts as splitString,
    randomName,
    joinTreeUri,
    isPathAEqUnderPathB,
    updateChildPath,
    isSubUriOrEqual,
    getWsfWithPath,
    getWsfWithActiveEditor,
    wsfGetBookmarkJsonUri,
    wsfReadBookmarkJson,
};