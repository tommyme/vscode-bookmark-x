export const ITEM_TYPE_BM      = 'bookmark';
export const ITEM_TYPE_GROUP   = 'group';
export const ITEM_TYPE_GROUPBM = 'groupbookmark';
export const ITEM_TYPE_GROUP_LIKE = [ITEM_TYPE_GROUP, ITEM_TYPE_GROUPBM]

export function typeIsGroupLike(type: string) {
  return [ITEM_TYPE_GROUP, ITEM_TYPE_GROUPBM].includes(type);
}

export const TREEVIEW_ITEM_CTX_TYPE_BM         = 'bookmark';
export const TREEVIEW_ITEM_CTX_TYPE_GROUP      = 'group';
export const TREEVIEW_ITEM_CTX_TYPE_GROUPBM    = 'groupbookmark';