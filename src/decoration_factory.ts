/**
 * 图标工厂
 */

import * as path from 'path';
import {Uri, window} from 'vscode';

export class DecorationFactory {
    public static readonly decorationUri = Uri.file(
        path.join(__dirname, "..", "resources", "gutter_icon_bm.svg")
    );

    public static readonly decoration = window.createTextEditorDecorationType(
        {
            gutterIconPath: DecorationFactory.decorationUri.fsPath,
            gutterIconSize: 'contain',
        }
    );
}