import { BookmarkTreeViewManager, TVMsgManager } from "./bookmark_tree_view";
import * as vscode from "vscode";
import { Bookmark } from "./functional_types";
import { Controller } from "./controller";
import {
  ICON_BOOKMARK,
  ICON_BOOKMARK_FIXING,
  ICON_BOOKMARK_RED,
} from "./constants";

export class ctxFixing {
  static fixing_bm: Bookmark | null = null;
  static stash() {
    if (this.fixing_bm) {
      // prev not fixing_bm not fixed, leave it red.
      let { rg } = Controller.get_props(this.fixing_bm);
      rg.vicache.get(this.fixing_bm.get_full_uri()).iconPath =
        ICON_BOOKMARK_RED;
      return true;
    }
    return false;
  }

  static startFixBookmark(bm: Bookmark) {
    this.fixing_bm = bm;
    let { rg } = Controller.get_props(this.fixing_bm);
    rg.vicache.get(bm.get_full_uri()).iconPath = ICON_BOOKMARK_FIXING;
    vscode.commands.executeCommand("setContext", "bmx.isFixingBm", true);
    TVMsgManager.setMsgFix();
  }

  static markAsToFix(bm: Bookmark) {
    let { rg } = Controller.get_props(bm);
    rg.vicache.get(bm.get_full_uri()).iconPath = ICON_BOOKMARK_RED;
  }

  static finishFixBookmark() {
    // called by autoFix or manualFix
    if (this.fixing_bm) {
      let { rg } = Controller.get_props(this.fixing_bm);
      let tvi = rg.vicache.get(this.fixing_bm.get_full_uri());
      tvi.iconPath = ICON_BOOKMARK;
      tvi.description = this.fixing_bm.lineText;
      BookmarkTreeViewManager.refreshCallback();
    }
    this.fixing_bm = null;
    vscode.commands.executeCommand("setContext", "bmx.isFixingBm", false);
    TVMsgManager.setMsgInit();
  }
}

export class ctxSortItem {
  static sorting = false;

  static selectSortItem() {
    vscode.commands.executeCommand("setContext", "bmx.isSorting", true); // use that flag to change status bar icon
    this.sorting = true;
    TVMsgManager.setMsgSort();
  }

  static deselectSortItem() {
    vscode.commands.executeCommand("setContext", "bmx.isSorting", false);
    this.sorting = false;
    TVMsgManager.setMsgInit();
  }
}
