import * as vscode from 'vscode';
import { Controller, SpaceMap } from './controller';
import { BookmarkTreeItem } from './bookmark_tree_item';
import { BookmarkTreeViewManager } from './bookmark_tree_view';
import { Bookmark, GroupBookmark, RootGroup } from './functional_types';
import * as bmutil from './util';
import * as commonutil from '../utils/util';
import { StoreManager } from '../../store';
import { DecorationFactory } from './decoration_factory';
import * as path from 'path';
import { SerializableGroup } from './serializable_type';
export class bmxLauncher {
  static async init(context: vscode.ExtensionContext) {
    StoreManager.home = context.globalStorageUri;
    await DecorationFactory.init();
    let controller: Controller = new Controller(context);
    BookmarkTreeViewManager.controller = controller;
    BookmarkTreeViewManager.init();

    let disposable;
    disposable = vscode.commands.registerTextEditorCommand('bookmark_x.toggleBookmark', (textEditor) => {
      controller.actionToggleBookmark(textEditor);
    });
    context.subscriptions.push(disposable);
  
    disposable = vscode.commands.registerTextEditorCommand('bookmark_x.toggleLabeledBookmark', (textEditor) => {
      controller.actionToggleLabeledBookmark(textEditor);
    });
    context.subscriptions.push(disposable);
  
    disposable = vscode.commands.registerTextEditorCommand('bookmark_x.toggleLabeledBookmarkForce', (textEditor) => {
      controller.actionToggleLabeledBookmark(textEditor, true);
    });
    context.subscriptions.push(disposable);
  
    // 添加分组的命令
    disposable = vscode.commands.registerCommand(
      'bookmark_x.addGroup', () => controller.actionAddGroup()
    );
    context.subscriptions.push(disposable);
  
    disposable = vscode.commands.registerCommand(
      'bookmark_x.activateGroup', (item: BookmarkTreeItem) => BookmarkTreeViewManager.activateGroup(item)
    );
    context.subscriptions.push(disposable);
  
    // 通过面板-删除分组
    disposable = vscode.commands.registerCommand(
      'bookmark_x.deleteGroup', (item: BookmarkTreeItem) => BookmarkTreeViewManager.deleteGroup(item)
    );
    context.subscriptions.push(disposable);
  
    disposable = vscode.commands.registerCommand(
      'bookmark_x.editGroupName', (item: BookmarkTreeItem) => BookmarkTreeViewManager.editNodeLabel(item)
    );
    context.subscriptions.push(disposable);
  
    // 通过面板-删除标签
    disposable = vscode.commands.registerCommand(
      'bookmark_x.deleteBookmark', (item: BookmarkTreeItem) => BookmarkTreeViewManager.deleteBookmark(item)
    );
    context.subscriptions.push(disposable);
  
    // triggered by clicking bookmark treeitem, jump to bookmark
    disposable = vscode.commands.registerCommand(
      'bookmark_x.jumpToBookmark', (bm: Bookmark) => controller.jumpToBookmark(bm)
    );
    context.subscriptions.push(disposable);
  
    disposable = vscode.commands.registerCommand(
      'bookmark_x.editBookmarkName', (item: BookmarkTreeItem) => BookmarkTreeViewManager.editNodeLabel(item)
    );
    context.subscriptions.push(disposable);
    
    disposable = vscode.commands.registerCommand(
      'bookmark_x.saveBookmarksInWorkspace', () => controller.doSaveSerializedRoot()
    );
    context.subscriptions.push(disposable);
    
    disposable = vscode.commands.registerCommand(
      'bookmark_x.clearData', () => controller.actionClearData()
    );
    context.subscriptions.push(disposable);
  
    disposable = vscode.commands.registerCommand(
      'bookmark_x.loadBookmarksInWorkSpace', () => controller.doLoadSerializedRoot()
    );
    context.subscriptions.push(disposable);
  
    disposable = vscode.commands.registerTextEditorCommand(
      'bookmark_x.revealBookmark', (textEditor) => controller.revealBookmark(textEditor)
    );
    context.subscriptions.push(disposable);
  
    disposable = vscode.commands.registerCommand(
      'bookmark_x.addSubGroup', (item: BookmarkTreeItem) => BookmarkTreeViewManager.addSubGroup(item)
    );
    context.subscriptions.push(disposable);
  
    disposable = vscode.commands.registerCommand(
      'bookmark_x.upgradeToGroupBookmark', (item: BookmarkTreeItem) => controller.upgradeToGroupBookmark(item.base! as Bookmark)
    );
    context.subscriptions.push(disposable);
  
    disposable = vscode.commands.registerCommand(
      'bookmark_x.downgradeToGroup', (item: BookmarkTreeItem) => controller.downgradeToGroup(item.base! as GroupBookmark)
    );
    context.subscriptions.push(disposable);
  
    disposable = vscode.commands.registerCommand(
      'bookmark_x.loadAllWsfState', () => controller.actionLoadAllWsfState()
    );
    context.subscriptions.push(disposable);
  
    disposable = vscode.commands.registerCommand(
      'bookmark_x.saveAllWsfState', () => controller.actionSaveAllWsfState()
    );
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand(
      'bookmark_x.quickSelectActiveGroup', () => BookmarkTreeViewManager.selectActiveGroup()
    );
    context.subscriptions.push(disposable);

    let activeEditor = vscode.window.activeTextEditor;
  
    if (activeEditor) {
      controller.updateDecorations();
    }
    vscode.window.onDidChangeActiveTextEditor(editor => {
      activeEditor = editor;
      if (activeEditor) {
        controller.updateDecorations();
      }
    }, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(e => {
      controller.documentChangeHandle(e);
    });
    vscode.workspace.onDidDeleteFiles(e => {
      let bms2del: Array<Bookmark> = [];
      e.files.forEach(file => {
        let path = file.fsPath;
        let wsf = commonutil.getWsfWithPath(path);
        let bms = controller.get_root_group(wsf!).get_bm_with_under_fspath(path);
        bms2del = bms2del.concat(bms);
      });
      controller.deleteBookmarks(bms2del);
      controller.updateDecorations();
      controller.saveState();
    });
    // 重命名文件应该改一下标签的fspath, 如果是文件夹, 就遍历缓存 然后判断fspath在原来的文件夹下面, 批量更改fspath
    vscode.workspace.onDidRenameFiles(e => {
      e.files.forEach(file => {
        // 不用更新deco
        let old_path = file.oldUri.fsPath;
        let wsf = commonutil.getWsfWithPath(old_path);
        let bms = controller.get_root_group(wsf!).get_bm_with_under_fspath(old_path);
        vscode.workspace.fs.stat(file.newUri).then(x => {
          if (x.type === vscode.FileType.Directory) {
            bms.forEach(bm => {
              let new_fspath = bmutil.updateChildPath(file.newUri.fsPath, bm.fsPath);
              bm.fsPath = new_fspath;
            });
          } else {
            bms.forEach(bm => { bm.fsPath = file.newUri.fsPath; });
          }
          controller.saveState();
        });
        
      });
    });
    vscode.workspace.onDidChangeWorkspaceFolders(e => {
      e.added.forEach(async wsf => {
        // 读取project的配置文件 初始化root group map
        let obj = await bmutil.wsfReadBookmarkJson(wsf);
        if (obj) {
          SpaceMap.root_group_map[wsf.uri.path] = SerializableGroup.build_root(obj);
          SpaceMap.active_group_map[wsf.uri.path] = controller.get_root_group(wsf);
        } else {
          SpaceMap.root_group_map[wsf.uri.path] = new RootGroup("", "", "", []);
          SpaceMap.active_group_map[wsf.uri.path] = SpaceMap.root_group_map[wsf.uri.path];
        }
        let rg = SpaceMap.root_group_map[wsf.uri.path];
        rg.cache = rg.bfs_get_nodes();
        rg.vicache = rg.bfs_get_tvmap();
        rg.sortGroupBookmark();
        controller.tprovider.refresh();
      });
      e.removed.forEach(folder => {
        delete SpaceMap.root_group_map[folder.uri.path];
        delete SpaceMap.active_group_map[folder.uri.path];
        controller.tprovider.refresh();
      });
    })
  }
}