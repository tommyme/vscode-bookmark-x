import {
    ExtensionContext,
    Range,
    TextEditor,
    window,
} from 'vscode';
import {Bookmark} from './bookmark';
import {DecorationFactory} from './decoration_factory';
import {SerializableBookmark} from './serializable_bookmark';

export class Main {
    public ctx: ExtensionContext;

    public readonly savedBookmarksKey = "bookmarkDemo.bookmarks"; // 缓存标签的key
    private bookmarks: Array<Bookmark>;

    constructor(ctx: ExtensionContext) {
        this.ctx = ctx;
        this.bookmarks = new Array<Bookmark>(); // 当前所有的标签

        this.restoreSavedState(); // 读取上一次记录的状态
        this.updateDecorations(); // 更新界面的标签
    }

    // 保存状态
    private saveState() {
        const serializedBookmarks: SerializableBookmark[] = [];
        for (let i = 0; i < this.bookmarks.length; i++) {
            const bookmark = SerializableBookmark.fromBookmark(this.bookmarks[i]);
            serializedBookmarks.push(bookmark);
        }
        this.ctx.workspaceState.update(this.savedBookmarksKey, serializedBookmarks);
    }

    // 读取上一次记录的状态
    private restoreSavedState() {
        let serializedBookmarks: SerializableBookmark[] | undefined = this.ctx.workspaceState.get(this.savedBookmarksKey);
        this.bookmarks = [];

        if (serializedBookmarks !== undefined) {
            for (let i = 0; i < serializedBookmarks.length; i++) {
                const serializedBookmark = Bookmark.fromSerializableBookMark(serializedBookmarks[i]); // 反序列化数据
                this.bookmarks.push(serializedBookmark);
            }
        }
    }

    // 激活or取消标签
    public editorActionToggleBookmark(textEditor: TextEditor) {
        if (textEditor.selections.length === 0) {
            return;
        }

        let documentFsPath = textEditor.document.uri.fsPath;
        // 可能存在着多个光标
        for (let selection of textEditor.selections) {
            let lineNumber = selection.start.line;
            let characterNumber = selection.start.character;
            let lineText = textEditor.document.lineAt(lineNumber).text.trim();

            this.toggleBookmark(
                documentFsPath,
                lineNumber,
                characterNumber,
                lineText,
            );
        }
    }

    // 切换标签
    private toggleBookmark(
        fsPath: string,
        lineNumber: number,
        characterNumber: number,
        lineText: string,
    ) {
        // 获取已存在的标签
        const existingBookmark = this.getExistingBookmarks(fsPath).find((bookmark) => {
            return bookmark.lineNumber === lineNumber;
        });

        // 如果已存在标签，就删除
        if (existingBookmark) {
            this.deleteBookmark(existingBookmark);
        } else {
            let bookmark = new Bookmark(fsPath, lineNumber, characterNumber, undefined, lineText);
            this.bookmarks.push(bookmark);
        }

        this.updateDecorations(); // 更新界面
        this.saveState(); // 保存最新状态
    }

    // 删除标签
    private deleteBookmark(bookmark: Bookmark) {
        let index = this.bookmarks.indexOf(bookmark);
        if (index < 0) {
            return;
        }

        this.bookmarks.splice(index, 1);
    }

    // 更新每个页面的标签
    private updateDecorations() {
        for (let editor of window.visibleTextEditors) {
            this.updateEditorDecorations(editor);
        }
    }

    // 绘制标签
    private updateEditorDecorations(textEditor: TextEditor) {
        if (typeof textEditor === "undefined") {
            return;
        }

        let fsPath = textEditor.document.uri.fsPath;
        let editorDecorations = this.getDecorationsList(fsPath);

        if (editorDecorations.length === 0) {
            textEditor.setDecorations(DecorationFactory.decoration, []);
            return;
        }
        
        textEditor.setDecorations(DecorationFactory.decoration, editorDecorations);
    }

    // 获取标签ranges
    private getDecorationsList(fsPath: string) {
        let editorDecorations: Range[] = [];
        let fileBookmarks = this.bookmarks.filter((bookmark) => {
            return bookmark.fsPath === fsPath;
        });

        fileBookmarks.forEach((bookmark) => {
            const range = new Range(bookmark.lineNumber, 0, bookmark.lineNumber, 0);
            editorDecorations.push(range);
        });

        return editorDecorations;
    }

    // 获取已存在的标签
    private getExistingBookmarks(fsPath: string) {
        return this.bookmarks.filter((bookmark) => {
            return bookmark.fsPath === fsPath;
        });
    }
}