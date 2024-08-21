import { ThemeColor, ThemeIcon } from "vscode";

export const ITEM_TYPE_BM      = 'bookmark';
export const ITEM_TYPE_GROUP   = 'group';
export const ITEM_TYPE_GROUPBM = 'groupbookmark';
export const ITEM_TYPE_GROUP_LIKE = [ITEM_TYPE_GROUP, ITEM_TYPE_GROUPBM];
export const ITEM_TYPE_BM_LIKE = [ITEM_TYPE_BM, ITEM_TYPE_GROUPBM];

export function typeIsGroupLike(type: string) {
  return ITEM_TYPE_GROUP_LIKE.includes(type);
}

export function typeIsBookmarkLike(type: string) {
  return ITEM_TYPE_BM_LIKE.includes(type);
}

export const TREEVIEW_ITEM_CTX_TYPE_BM         = 'bookmark';
export const TREEVIEW_ITEM_CTX_TYPE_GROUP      = 'group';
export const TREEVIEW_ITEM_CTX_TYPE_GROUPBM    = 'groupbookmark';
export const TREEVIEW_ITEM_CTX_TYPE_SORTING_ITEM = 'sortItem';

// state key
export const SAVED_WSFSDATA_KEY    = "bookmarkDemo.wsfsData";

// icons
// colors are controlled by contributes.
export const ICON_BOOKMARK = new ThemeIcon("bookmark");
export const ICON_ACTIVE_GROUP = new ThemeIcon("folder-opened", new ThemeColor("bookmark_x.activeGroupColor"));
export const ICON_GROUP = new ThemeIcon("folder");
// support icon change when sorting later.
// export const ICON_SORTING_BOOKMARK = new ThemeIcon("bookmark", new ThemeColor("bookmark_x.sortingItemColor"));
// export const ICON_SORTING_ACTIVE_GROUP = new ThemeIcon("folder-opened", new ThemeColor("bookmark_x.sortingItemColor"));
// export const ICON_SORTING_GROUP = new ThemeIcon("folder", new ThemeColor("bookmark_x.sortingItemColor"));

export const WSF_TVI_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><title>folder_type_vscode_opened</title><path d="M27.4,5.5H18.2L16.1,9.7H4.3v4H.5L4.3,26.5H29.5V5.5ZM20.2,7.6h7.1V9.7H19.2Zm5.5,6.1H6.6V11.8H27.4v7.626Z" style="fill:#7bb4db"/><path d="M30.257,12.333l-4.324-2.082a1.308,1.308,0,0,0-1.492.253L10.285,23.411a.875.875,0,0,0-.057,1.236.766.766,0,0,0,.057.057l1.157,1.052a.873.873,0,0,0,1.116.049L29.607,12.873A.868.868,0,0,1,31,13.565v-.05A1.311,1.311,0,0,0,30.257,12.333Z" style="fill:#0065a9"/><path d="M30.257,28.788,25.933,30.87a1.308,1.308,0,0,1-1.492-.253L10.285,17.71a.875.875,0,0,1-.057-1.236.766.766,0,0,1,.057-.057l1.157-1.052a.873.873,0,0,1,1.116-.049L29.607,28.248A.868.868,0,0,0,31,27.556v.05A1.311,1.311,0,0,1,30.257,28.788Z" style="fill:#007acc"/><path d="M25.933,30.871a1.308,1.308,0,0,1-1.491-.254.768.768,0,0,0,1.311-.543V11.047a.768.768,0,0,0-1.311-.543,1.306,1.306,0,0,1,1.491-.254l4.324,2.079A1.314,1.314,0,0,1,31,13.512v14.1a1.314,1.314,0,0,1-.743,1.183Z" style="fill:#1f9cf0"/></svg>`
export const svgBookmark = `<svg id="layer1" data-name="layer 1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32"><defs><style>.cls-1{fill:url(#v);}</style><linearGradient id="v" x1="-3.34" y1="16.24" x2="37.41" y2="15.73" gradientUnits="userSpaceOnUse"><stop offset="0.19" stop-color="#00d39c"/><stop offset="0.75" stop-color="#008c86"/></linearGradient></defs><title>bookmark x logo</title><path class="cls-1" d="M25.8,2.5H9.1A3.55,3.55,0,0,0,5.55,6h0V29.5H22.26V6H15V16.15l-2.66-1.28L9.72,16.15V6H6.84A2.26,2.26,0,0,1,9.1,3.79H25.16V26.6a.65.65,0,1,0,1.29,0V3.15A.65.65,0,0,0,25.8,2.5Z"/></svg>`;