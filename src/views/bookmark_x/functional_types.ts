import {DecorationFactory} from './decoration_factory';
import {TextEditorDecorationType, ThemeColor, ThemeIcon, TreeItem, Uri, window, workspace} from 'vscode';
import {SerializableBookmark, SerializableGroup, SerializableGroupBookmark} from './serializable_type';
import {ICON_ACTIVE_GROUP, ICON_GROUP, ITEM_TYPE_BM, ITEM_TYPE_GROUP, ITEM_TYPE_GROUPBM, ITEM_TYPE_GROUP_LIKE, typeIsGroupLike, } from './constants';
import * as util from './util';
import { BookmarkTreeItem, BookmarkTreeItemFactory } from './bookmark_tree_item';

export type NodeType = Group | Bookmark | GroupBookmark;
export type GroupLike = Group | GroupBookmark;
export type BookmarkLike = Bookmark | GroupBookmark;
export class BaseFunctional {
    name: string;
    uri: string;
    type: string;
    children: (NodeType)[];
    constructor(
        name: string,
        uri: string,
        type: string,
        children: (NodeType)[],
    ) {
        this.name = name;
        this.uri = uri;
        this.type = type;
        this.children = children;
    }

    /**
     * return full uri
     * @returns {type} - return value desc
     */
    public get_full_uri(): string {
        // 针对root node调用的情况 特殊处理
        if (this.uri === '') {
            return this.name;
        }
        return [this.uri, this.name].join("/");
    }
}

export class Group extends BaseFunctional {
    color: string;
    // decoration: TextEditorDecorationType | null;
    
    constructor(
        name: string,
        color: string,
        uri: string,
        children: (NodeType)[]=[]
    ) {
        super(name, uri, ITEM_TYPE_GROUP, children);
        this.color = color;
        // this.decoration = DecorationFactory.defaultDecoration;
    }

    public static fromSerialized(group: SerializableGroup): Group {
        let children = group.children.map((child) => {
            if (child) {}
        });
        return new Group(
            group.name,
            group.color,
            group.uri
        );
    }

    // public getDecoration() {
    //     return this.decoration;
    // }

    public static sortByName(a: Group, b: Group): number {
        return a.name.localeCompare(b.name);
    }

    public serialize(): SerializableGroup {
        let children = this.children.map(child => child.serialize());
        return new SerializableGroup(this.name, this.color, this.uri, children);
    }

    /**
     * get node with type string
     * 通过 uri 的形式进行索引
     * @param {type} full_uri - e.g. group "a/b/c" or bookmark "a/b/c"
     * @param {type} type - 'group' or 'bookmark'
     * @returns {type} - return value desc
     */
    public get_node(full_uri: string, type: string|null=null): NodeType | undefined {
        if (full_uri === '') {
            return this;
        }

        const parts = full_uri.split('/');
        let current: NodeType | undefined = this;

        for (let part of parts) {
            // find 找不到会返回undefined
            current = (current.children?.find(child => child.name === part) || undefined) as (NodeType | undefined);
            if (!current) { break; } // 当前层级找不到了
        }

        // 再看type相同不
        if (current && (current.type === type || type === null)) {
            return current;
        } else {
            // 都不满足, 不行
            return undefined;
        }
    }

    public add_group(group: Group) {
        let father_group = this.get_node(group.uri, ITEM_TYPE_GROUP) as Group;
        father_group.children.push(group);
        return father_group;
    }

    public sortChildrenBookmarks(fn: Function) {
        // this.children.sort(fn);
    }

    public static sortGroupFirst(a: BaseFunctional, b: BaseFunctional) {
        if (typeIsGroupLike(a.type) && b.type === ITEM_TYPE_BM) {
            return -1; // 'group' 排在 'bookmark' 前面
        } else if (a.type === ITEM_TYPE_BM && typeIsGroupLike(b.type)) {
            return 1; // 'bookmark' 排在 'group' 后面
        } else if (a.type === b.type) {
            return a.name.localeCompare(b.name, "zh-Hant"); // 相同 type 按照 name 排序
        } else {
            return 0; // 保持原有顺序
        }
    }
    public static sortPlain(a: BaseFunctional, b: BaseFunctional) {
        return a.name.localeCompare(b.name, "zh-Hant");
    }

    /**
     * sort (group and bookmarks) inplace
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public sortGroupBookmark() {
        let config = workspace.getConfiguration('bookmarkX');
        let sortOption = config.get('sort') as string;
        if (sortOption === "group first") {
            this.children.sort(Group.sortGroupFirst);  // group在前 bookmark在后
        } else if (sortOption === 'plain') {
            this.children.sort(Group.sortPlain);
        } else if(sortOption === 'manual') {
            return;
        } else {
            window.showInformationMessage("sort fail, sort option invalid: "+sortOption);
        }
    }

    /**
     * 查看孩子里面有没有名称冲突
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public checkConflictName(node: BaseFunctional) {
        this.children.forEach(child => {
            if (child.name === node.name) { return true; }
        });
        return false;
    }
    
    /**
     * bfs遍历节点, 返回full_uri为key, node为value的map
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public bfs_get_nodes(): NodeUriMap {
        let res = new NodeUriMap();
        function bfs(node: BaseFunctional) {
            res.set(node.get_full_uri(), node);
            if (node.children.length === 0) {
                return;
            } else {
                node.children.forEach(item => {bfs(item);});
            }
        }
        bfs(this);
        return res;
    }

    public bfs_get_tvmap(): ViewItemUriMap {
        console.log("bfs get tv map");
        let res = new ViewItemUriMap();
        function bfs(node: BaseFunctional) {
            let view_item = BookmarkTreeItemFactory.createType(node);
            res.set(node.get_full_uri(), view_item);
            if (node.children.length === 0) {
                return;
            } else {
                node.children.forEach(item => {bfs(item);});
            }
        }
        bfs(this);
        return res;
    }

    /**
     * 根据group树,来刷新所有子节点的uri
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public static dfsRefreshUri(group: Group) {
        if (group.children.length === 0) {
            return;
        }
        group.children.forEach((child: NodeType) => {
            child.uri = group.get_full_uri();
            if (typeIsGroupLike(child.type)) {
                Group.dfsRefreshUri(child as Group);
            }
        });
    }
}

export class Bookmark extends BaseFunctional {
    fsPath: string;
    line: number;
    col: number;
    lineText: string;
    failedJump: boolean;
    isLineNumberChanged: boolean;
    // group: Group | undefined;   // 在serializableGroup.build里面进行建链的 (目前由于有缓存 所以不需要建链了)

    constructor(
        fsPath: string,
        line: number,
        col: number,
        name: string = "",
        lineText: string,
        uri: string
    ) {
        super(name, uri, ITEM_TYPE_BM, []);
        this.fsPath = fsPath;
        this.line = line;
        this.col = col;
        this.lineText = lineText;
        // not used
        this.failedJump = false;
        this.isLineNumberChanged = false;
    }

    // public getDecoration() {
    //     return this.group!.getDecoration();
    // }

    public static sortByLocation(a: Bookmark, b: Bookmark): number {
        return a.fsPath.localeCompare(b.fsPath)
            || (a.line - b.line)
            || (a.col - b.col);
    }

    // 根据label排序
    public static sortByName(a: Bookmark, b: Bookmark): number {
        if (a.name > b.name) {
            return 1;
        } else if (a.name < b.name) {
            return -1;
        } else {
            return 0;
        }
    }

    public serialize(): SerializableBookmark {
        return new SerializableBookmark(
            this.fsPath, this.line, this.col,
            this.name, this.lineText, this.uri
        );
    }
}


export class GroupBookmark extends Group {
    fsPath: string;
    line: number;
    col: number;
    lineText: string;
    failedJump: boolean;
    isLineNumberChanged: boolean;

    constructor(
        bm: Bookmark,
        group: Group|undefined=undefined
    ) {
        if (!group) {
            group = new Group(bm.name, util.randomColor(), bm.uri);
        }
        super(group.name, group.color, group.uri, group.children);
        this.type = ITEM_TYPE_GROUPBM;
        this.fsPath = bm.fsPath;
        this.line = bm.line;
        this.col = bm.col;
        this.lineText = bm.lineText;
        this.failedJump = bm.failedJump;
        this.isLineNumberChanged = bm.isLineNumberChanged;
        // this.decoration = DecorationFactory.defaultDecoration;
    }
    public serialize(): SerializableGroupBookmark {
        let sgroup = this.toGroup().serialize();
        let sbm = this.toBookmark().serialize();
        return new SerializableGroupBookmark(sgroup, sbm);
    }

    public toGroup(): Group {
        return new Group(this.name, this.color, this.uri, this.children);
    }

    private toBookmark(): Bookmark {
        return new Bookmark(this.fsPath, this.line, this.col, this.name, this.lineText, this.uri);
    }
}

class UriMap<T> extends Object {
    protected map: { [key: string]: T } = {};
    public check_uri_exists(uri: string) {
        let same = this.keys().filter(key => key === uri);
        if (same.length > 0) {
            return true;
        } else {
            return false;
        }
    }
    public set(key: string, value: T) {
        this.map[key] = value;
    }
    public get(key: string): T {
        return this.map[key];
    }
    public del(key: string) {
        delete this.map[key];
    }
    public keys(): Array<string> {
        return Object.keys(this.map);
    }
    public values(): Array<T> {
        return Object.values(this.map);
    }
    public del_group(uri: string) {
        this.keys().forEach(key => {
            if (util.isSubUriOrEqual(uri, key)) {
                this.del(key);
            }
        });
    }
    public rename_key(old_key: string, new_key: string) {
        let x = this.get(old_key);
        this.set(new_key, x);
        this.del(old_key);
    }
    public entries(): Array<[string, T]> {
        return Object.entries(this.map);
    }
}
export class NodeUriMap extends UriMap<BaseFunctional> {
    public findOverlapBookmark() {
        let result = [];
        let map: { [key: number]: Bookmark} = {};
        for (let key of this.keys()) {
            let node = this.get(key);
            if (node.type !== ITEM_TYPE_BM) {
                continue;
            }
            let bm = node as Bookmark;
            if (bm.line in map) {
                result.push(bm.get_full_uri());
            } else {
                map[bm.line] = bm;
            }
        }
        return result;
    }
    public bookmark_num() {
        let result = 0;
        for (let key of this.keys()) {
            if (this.get(key).type === ITEM_TYPE_BM) { result++; }
        }
        return result;
    }
}

export class ViewItemUriMap extends UriMap<BookmarkTreeItem> {
    public refresh_active_icon_status(new_full_uri: string) {
        this.keys().forEach(key => {
            // reset icon status
            let tvi = this.get(key);
            if (ITEM_TYPE_GROUP_LIKE.includes(tvi.base!.type)) {
                if (util.isSubUriOrEqual(key, new_full_uri)) {
                    tvi.iconPath = ICON_ACTIVE_GROUP;
                } else {
                    tvi.iconPath = ICON_GROUP;
                }
            }
        });
    }
}

/**
 * 
 * 封装一些步骤多一点的cache操作
 */
export class RootGroup extends Group {
    cache: NodeUriMap;
    vicache: ViewItemUriMap;

    constructor(
        name: string,
        color: string,
        uri: string,
        children: (NodeType)[]=[]
    ) {
        super(name, color, uri, children);
        this.cache = new NodeUriMap();
        this.vicache = new ViewItemUriMap();
    }

    public add_node_recache_all<T extends NodeType>(node: T) {
        let group = this.get_node(node.uri) as Group;
        if (group) {
            group.children.push(node);
        } else {
            throw new Error("add node recache error");
        }
        this.cache.set(node.get_full_uri(), node);
        this.vicache.set(node.get_full_uri(), BookmarkTreeItemFactory.createType(node));
        return group;
    }

    public replace_node<T extends NodeType>(a: T, b: T) {
        // delete
        this.cut_node(a);
        this.cache.del(a.get_full_uri());
        this.vicache.del(a.get_full_uri());
        // add
        this.add_node_recache_all(b).sortGroupBookmark();
    }

    /**
     * 找到父亲,从父亲的儿子里面splice出去;
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public cut_node(node: NodeType) {
        let group = this.get_node(node.uri, ITEM_TYPE_GROUP) as Group;
        
        let index = group.children.indexOf(node);
        if (index < 0) {
            return;
        }
        group.children.splice(index, 1); 
    }
    /**
     * 断链; 刷新cache
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public cut_node_recache(node: NodeType) {
        this.cut_node(node);
        if (node instanceof Bookmark) {
            this.cache.del(node.get_full_uri());
        } else if (node instanceof Group) {
            // 由于group可能有很多级, 所以直接重新bfs一遍, 构建cache
            this.cache = this.bfs_get_nodes();
        }
    }

    /**
     * move bm to target group
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public mv_bm_recache_all(bm: Bookmark, target_group: Group) {
        let old_key = bm.get_full_uri();
        this.cut_node_recache(bm);
        bm.uri = target_group.get_full_uri();
        // bm.group = target_group;
        // let new_key = bm.get_full_uri();
        this.add_node_recache_all(bm);
        this.vicache.del(old_key);
        // this.vicache.rename_key(old_key, new_key);
    }

    /**
     * bm.fspath equal or under fspath
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public get_bm_with_under_fspath(fspath: string): Array<Bookmark> {
        let res: Array<Bookmark> = [];
        this.cache.keys().forEach(key => {
            let node = this.cache.get(key);
            if (node instanceof Bookmark && util.isPathAEqUnderPathB(node.fsPath, fspath)) {
                res.push(node);
            }
        });
        return res;
    }
}