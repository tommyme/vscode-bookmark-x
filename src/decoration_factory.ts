/**
 * 图标工厂
 */

import * as path from 'path';
import {Uri, TextEditorDecorationType, window, workspace} from 'vscode';

const svgBookmark = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
<path d="M7 30 L7 8 Q7 2 13 2 L19 2 Q25 2 25 8 L25 30 L16 23 Z" fill="#888888ff" />
</svg>`;

export class DecorationFactory {
    public static svgDir: Uri;
    public static readonly decorationUri = Uri.file(
        path.join(__dirname, '..', 'resources', 'gutter_icon_bm.svg')
    );

    public static readonly decoration = window.createTextEditorDecorationType(
        {
            gutterIconPath: DecorationFactory.decorationUri.fsPath,
            gutterIconSize: 'contain',
        }
    );

    static async create(color: string): Promise<[TextEditorDecorationType, Uri]> {

        let svg: string = svgBookmark;

        svg = svg.replace('#888888ff', color);

        let fileName = `shape_${color}_.svg`;
        let bytes = Uint8Array.from(svg.split('').map(c => c.charCodeAt(0)));
        let svgUri = Uri.joinPath(DecorationFactory.svgDir, fileName);

        try {
            let stat = await workspace.fs.stat(svgUri);
            if (stat.size < 1) {
                await workspace.fs.writeFile(svgUri, bytes);
            }
        } catch (e) {
            await workspace.fs.writeFile(svgUri, bytes);
        }

        const decorationOptions = {
            gutterIconPath: svgUri,
            gutterIconSize: 'contain',
            overviewRulerColor: '#' + color,
            isWholeLine: true,
        };

        const result = window.createTextEditorDecorationType(decorationOptions);

        return [result, svgUri];
    }
}