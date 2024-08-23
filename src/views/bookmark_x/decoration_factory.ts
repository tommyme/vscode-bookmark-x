import * as path from 'path';
import { Uri, TextEditorDecorationType, window, workspace } from 'vscode';
import { StoreManager } from '../../store';
import { WSF_TVI_ICON, SVG_BOOKMARK } from './constants';

export class DecorationFactory {
    public static decoration: TextEditorDecorationType;
    public static wsf_icon: string;

    public static async setDecoFromSettings() {
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
                    { gutterIconPath: decoFilePath, gutterIconSize: '90%' }
                );
                set_done = true;
            } catch (err) {
                window.showInformationMessage("svg file load error (default svg used): " + String(err));
            }
        }
        return set_done;
    }

    public static async init() {
        await this.initSvgdir();
        await this.initIcon();
    }

    public static async initSvgdir() {
        let dirPath = path.join(StoreManager.home.fsPath, 'svg_icons');
        await StoreManager.ensureDir(dirPath);
        let default_svg_path = path.join(dirPath, "default.svg");
        await StoreManager.ensureFile(default_svg_path, SVG_BOOKMARK);
        if (!await DecorationFactory.setDecoFromSettings()) {
            DecorationFactory.decoration = window.createTextEditorDecorationType(
                {
                    gutterIconPath: default_svg_path,
                    gutterIconSize: '90%',
                }
            );
        }
    }

    public static async initIcon() {
        let dirPath = path.join(StoreManager.home.fsPath, "icons");
        await StoreManager.ensureDir(dirPath);
        let svgPath = path.join(dirPath, "wsf.svg");
        await StoreManager.ensureFile(svgPath, WSF_TVI_ICON);
        this.wsf_icon = svgPath;
    }
}