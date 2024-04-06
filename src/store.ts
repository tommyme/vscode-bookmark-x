import { Uri, workspace } from "vscode";
import * as fs from 'fs';
import * as path from 'path';

export class StoreManager {
  static home: Uri;
  public static async ensureDir(dir: string) {
    let dirUri = Uri.file(dir);
    try {
      let st = await workspace.fs.stat(dirUri);
      if (st.type === 1) { // file
        // need to delete the file and create folder
        await workspace.fs.delete(dirUri);
        await workspace.fs.createDirectory(dirUri);
      } else if (st.type === 2) { // folder
        return;
      }
    }
    catch (error) {
      // dir not found, create it
      await workspace.fs.createDirectory(dirUri);
    }
  }

  public static async ensureFile(path: string, content: string) {
    let fileUri = Uri.file(path);
    try {
      let st = await workspace.fs.stat(fileUri);
      if (st.type === 1) {
        // compare content
        let res = fs.readFileSync(path, 'utf-8');
        if (res === content) {
          return;
        } else {
          // sync content
          fs.writeFileSync(path, content);
        }
      }
    } catch (error) {
      // file not exist
      fs.writeFileSync(path, content);
    }
  }
}