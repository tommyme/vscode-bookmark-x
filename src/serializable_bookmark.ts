/**
 * 反序列化标签
 */

import { Bookmark } from './bookmark';

export class SerializableBookmark {
    fsPath: string;
    lineNumber: number;
    characterNumber: number;
    label?: string;
    lineText: string;
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
        this.isLineNumberChanged = false;
    }

    public static fromBookmark(bookmark: Bookmark): SerializableBookmark {
        return new SerializableBookmark(
            bookmark.fsPath,
            bookmark.lineNumber,
            bookmark.characterNumber,
            bookmark.label,
            bookmark.lineText,
        );
    }
}