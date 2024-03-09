import {DecorationFactory} from './decoration_factory';
import {TextEditorDecorationType, Uri} from 'vscode';
import {SerializableBookmark, SerializableGroup} from './serializable_type';
import * as util from './util';

class BaseFunctional {
    name: string;
    uri: string;
    type: string;
    children: (Group|Bookmark)[];
    constructor(
        name: string,
        uri: string,
        type: string,
        children: (Group|Bookmark)[],
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
    decoration: TextEditorDecorationType | null;
    decorationSvg: Uri;
    
    constructor(
        name: string,
        color: string,
        uri: string,
        children: (Group|Bookmark)[]=[]
    ) {
        super(name, uri, "group", children);
        this.color = color;
        this.decoration = DecorationFactory.defaultDecoration;
        this.decorationSvg = DecorationFactory.defaultDecorationUri;
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

    public getDecoration() {
        return this.decoration;
    }

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
    public get_node(full_uri: string, type: string|null=null): Group | Bookmark | undefined {
        if (full_uri === '') {
            return this;
        }

        const parts = full_uri.split('/');
        let current: Group | Bookmark | undefined = this;

        for (let part of parts) {
            // find 找不到会返回undefined
            current = (current.children?.find(child => child.name === part) || undefined) as (Group | Bookmark | undefined);
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
        let father_group = this.get_node(group.uri, 'group') as Group;
        father_group.children.push(group);
        return father_group;
    }

    public sortChildrenBookmarks(fn: Function) {
        // this.children.sort(fn);
    }

    /**
     * sort (group and bookmarks) in self
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public sortGroupBookmark() {
        this.children.sort((a, b) => {
            if (a.type === 'group' && b.type === 'bookmark') {
                return -1; // 'group' 排在 'bookmark' 前面
            } else if (a.type === 'bookmark' && b.type === 'group') {
                return 1; // 'bookmark' 排在 'group' 后面
            } else if (a.type === b.type) {
                return a.name.localeCompare(b.name, "zh-Hant"); // 相同 type 按照 name 排序
            } else {
                return 0; // 保持原有顺序
            }
        });
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
}

export class Bookmark extends BaseFunctional {
    fsPath: string;
    line: number;
    col: number;
    lineText: string;
    failedJump: boolean;
    isLineNumberChanged: boolean;
    group: Group | undefined;   // 在serializableGroup.build里面进行建链的

    constructor(
        fsPath: string,
        line: number,
        col: number,
        name: string = "",
        lineText: string,
        uri: string
    ) {
        super(name, uri, "bookmark", []);
        this.fsPath = fsPath;
        this.line = line;
        this.col = col;
        this.lineText = lineText;
        // not used
        this.failedJump = false;
        this.isLineNumberChanged = false;
    }

    public getDecoration() {
        return this.group!.getDecoration();
    }

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

export class Cache extends Object {
    private map: { [key: string]: BaseFunctional } = {};
    public check_uri_exists(uri: string) {
        let same = this.keys().filter(key => key === uri);
        if (same.length > 0) {
            return true;
        } else {
            return false;
        }
    }

    public set(key: string, value: BaseFunctional) {
        this.map[key] = value;
    }
    public get(key: string): BaseFunctional {
        return this.map[key];
    }
    public del(key: string) {
        delete this.map[key];
    }
    public keys(): Array<string> {
        return Object.keys(this.map);
    }
    public findOverlapBookmark() {
        let result = [];
        let map: { [key: number]: Bookmark} = {};
        for (let key of this.keys()) {
            let node = this.get(key);
            if (node.type !== 'bookmark') {
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
        let result = 0
        for (let key of this.keys()) {
            if (this.get(key).type == 'bookmark') { result++ }
        }
        return result;
    }
}

export class RootGroup extends Group {
    cache: Cache;

    constructor(
        name: string,
        color: string,
        uri: string,
        children: (Group|Bookmark)[]=[]
    ) {
        super(name, color, uri, children);
        this.cache = new Cache();
    }
    /**
     * rootnode add bookmark and return bookmark's father group
     * it'll refresh the cache
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public add_bookmark_recache(bookmark: Bookmark) {
        let group = this.get_node(bookmark.uri, 'group') as Group;
        if (group) {
            group.children.push(bookmark);
            bookmark.group = group;
        } else {
            throw new Error("add bookmark 时 对应的group没找到!");
        }
        this.cache_add_node(bookmark);
        return group;
    }

    /**
     * 找到父亲,从父亲的儿子里面splice出去;
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public cut_node(node: Bookmark|Group) {
        let group = this.get_node(node.uri, 'group') as Group;
        
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
    public cut_node_recache(node: Bookmark | Group) {
        this.cut_node(node);
        if (node instanceof Bookmark) {
            this.cache.del(node.get_full_uri());
        } else if (node instanceof Group) {
            // 由于group可能有很多级, 所以直接重新bfs一遍, 构建cache
            this.cache_build();
        }
    }

    public mv_group(group: Group, target_uri: string) {
        // 遍历组内 children, 改变其uri
        group.children.forEach(item => {
            item.uri = util.joinTreeUri([target_uri, group.name]);
        });
        // TODO 检查一下cache里面的引用变没变
        this.cut_node_recache(group);
        group.uri = target_uri;
        // mv 完毕
    }
    /**
     * bfs遍历根节点, 返回full_uri为key, node为value的map
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public bfs_get_nodes(): Cache {
        let res = new Cache();
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

    public cache_build() {
        this.cache = this.bfs_get_nodes();
    }

    /**
     * 给cache简单地加个key
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public cache_add_node(node: Bookmark|Group) {
        this.cache.set(node.get_full_uri(), node);
    }
    public cache_del_node(node: Bookmark|Group) {
        this.cache.del(node.get_full_uri());
    }

    /**
     * 根据group树,来刷新所有子节点的uri
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public static refresh_uri(group: Group) {
        if (group.children.length === 0) {
            return;
        }
        group.children.forEach((child: Group|Bookmark) => {
            child.uri = group.get_full_uri();
            if (child.type == "group") {
                RootGroup.refresh_uri(child as Group);
            }
        }); 
    }

    /**
     * bm.fspath equal or under fspath
     * @param {type} param1 - param1 desc
     * @returns {type} - return value desc
     */
    public get_bm_with_under_fspath(fspath: string): Array<Bookmark> {
        let res: Array<Bookmark> = []
        this.cache.keys().forEach(key => {
            let node = this.cache.get(key);
            if (node instanceof Bookmark && util.isPathAEqUnderPathB(node.fsPath, fspath)) {
                res.push(node)
            }
        })
        return res
    }
}