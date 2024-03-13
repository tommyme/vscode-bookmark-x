/**
 * 图标工厂
 */

import * as fs from 'fs';
import * as path from 'path';
import {Uri, TextEditorDecorationType, window, workspace, DecorationRenderOptions} from 'vscode';

const svgBookmark = `<svg id="layer1" data-name="layer 1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32"><defs><style>.cls-1{fill:url(#v);}</style><linearGradient id="v" x1="-3.34" y1="16.24" x2="37.41" y2="15.73" gradientUnits="userSpaceOnUse"><stop offset="0.19" stop-color="#00d39c"/><stop offset="0.75" stop-color="#008c86"/></linearGradient></defs><title>bookmark x logo</title><path class="cls-1" d="M25.8,2.5H9.1A3.55,3.55,0,0,0,5.55,6h0V29.5H22.26V6H15V16.15l-2.66-1.28L9.72,16.15V6H6.84A2.26,2.26,0,0,1,9.1,3.79H25.16V26.6a.65.65,0,1,0,1.29,0V3.15A.65.65,0,0,0,25.8,2.5Z"/></svg>`;

export class DecorationFactory {
    public static svgDir: Uri;  // 用于在workspace里面创建svg文件, 需要在controller里面进行初始化

    public static decoration: TextEditorDecorationType;

    static async create(color: string): Promise<[TextEditorDecorationType, Uri]> {

        let svg: string = svgBookmark;

        svg = svg.replace('#888888ff', color);

        let fileName = `shape_${color.slice(1)}_.svg`;
        let bytes = Uint8Array.from(svg.split('').map(c => c.charCodeAt(0)));
        let svgUri = Uri.joinPath(DecorationFactory.svgDir, fileName);

        try {
            let stat = await workspace.fs.stat(svgUri);
            Uri.file(
                path.join(__dirname, '..', 'resources', 'gutter_icon_bm.svg')
            );
            if (stat.size < 1) {
                await workspace.fs.writeFile(svgUri, bytes);
            }
        } catch (e) {
            await workspace.fs.writeFile(svgUri, bytes);
        }

        const decorationOptions: DecorationRenderOptions = {
            gutterIconPath: svgUri.path,
            gutterIconSize: 'contain',
            overviewRulerColor: color.toLowerCase(),
            isWholeLine: true,
        };

        const result = window.createTextEditorDecorationType(decorationOptions);

        return [result, svgUri];
    }

    public static async set_deco_from_settings() {
        let config = workspace.getConfiguration('bookmarkX');
        let decoFilePath = config.get('bookmarkSvg') as string;
        let set_done = false;
        if (decoFilePath) {
            let uri = Uri.file(decoFilePath);
            try {
                let stat = await workspace.fs.stat(uri);
                // 只有文件存在的时候才会进入这里
                console.log(stat);
                DecorationFactory.decoration = window.createTextEditorDecorationType(
                    { gutterIconPath: decoFilePath, gutterIconSize: 'contain' }
                );
                set_done = true;
            } catch (err) {
                window.showInformationMessage("svg file load error (default svg used): "+String(err));
            }
        }
        return set_done;
    }

    public static async init_svgdir() {
        let dir = Uri.file(
            path.join(DecorationFactory.svgDir.fsPath, 'svg_icons')
        );
        await workspace.fs.createDirectory(dir);
        let default_svg_path = path.join(dir.fsPath, "default.svg");
        if (!fs.existsSync(default_svg_path)) {
            try {
                fs.writeFileSync(default_svg_path, svgBookmark);
            } catch(err) {
                window.showErrorMessage(String(err));
            }
        }
        if (!await DecorationFactory.set_deco_from_settings()) {
            DecorationFactory.decoration = window.createTextEditorDecorationType(
                {
                    gutterIconPath: default_svg_path,
                    gutterIconSize: 'contain',
                }
            );
        }
    }
}