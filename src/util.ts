import * as path from 'path';
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


export {
    randomColor,
    splitTreeUri2parts as splitString,
    randomName,
    joinTreeUri,
    isPathAEqUnderPathB,
    updateChildPath
};