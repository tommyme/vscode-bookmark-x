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
        return input.splice(1).join("/")
    } else {
        return input.join("/")
    }
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
    joinTreeUri
}