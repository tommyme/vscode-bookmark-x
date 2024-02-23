/**
 * 标签-构造函数
 */

import {SerializableBookmark} from './serializable_bookmark';
import {Group} from './group';

export class Bookmark {
    fsPath: string;
    lineNumber: number;
    characterNumber: number;
    label: string;
    lineText: string;
    failedJump: boolean;
    isLineNumberChanged: boolean;
    group: Group;

    constructor(
        fsPath: string,
        lineNumber: number,
        characterNumber: number,
        label: string="",
        lineText: string,
        group: Group,
    ) {
        this.fsPath = fsPath;
        this.lineNumber = lineNumber;
        this.characterNumber = characterNumber;
        this.label = label;
        this.lineText = lineText;
        this.failedJump = false;
        this.isLineNumberChanged = false;
        this.group = group;
    }

    public static fromSerializableBookMark(
        serialized: SerializableBookmark,
        groupGetter: (groupName: string) => Group
    ): Bookmark {
        return new Bookmark(
            serialized.fsPath,
            serialized.lineNumber,
            serialized.characterNumber,
            serialized.label,
            serialized.lineText,
            groupGetter(serialized.groupName)
        );
    }

    public getDecoration() {
        return this.group.getDecoration();
    }

    public static sortByLocation(a: Bookmark, b: Bookmark): number {
        return a.fsPath.localeCompare(b.fsPath)
            || (a.lineNumber - b.lineNumber)
            || (a.characterNumber - b.characterNumber);
    }

    // 根据label排序
    public static sortByName(a: Bookmark, b: Bookmark): number {
        if (a.label > b.label) {
            return 1
        } else if (a.label < b.label) {
            return -1
        } else {
            return 0
        }
    }
}