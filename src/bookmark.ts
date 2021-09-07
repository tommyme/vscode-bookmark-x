/**
 * 标签-构造函数
 */

import {SerializableBookmark} from './serializable_bookmark';

export class Bookmark {
    fsPath: string;
    lineNumber: number;
    characterNumber: number;
    label?: string;
    lineText: string;
    failedJump: boolean;
    isLineNumberChanged: boolean;

    constructor(
        fsPath: string,
        lineNumber: number,
        characterNumber: number,
        label: string | undefined,
        lineText: string,
    ) {
        this.fsPath = fsPath;
        this.lineNumber = lineNumber;
        this.characterNumber = characterNumber;
        this.label = label;
        this.lineText = lineText;
        this.failedJump = false;
        this.isLineNumberChanged = false;
    }

    public static fromSerializableBookMark(
        serialized: SerializableBookmark,
    ): Bookmark {
        return new Bookmark(
            serialized.fsPath,
            serialized.lineNumber,
            serialized.characterNumber,
            serialized.label,
            serialized.lineText,
        );
    }
}