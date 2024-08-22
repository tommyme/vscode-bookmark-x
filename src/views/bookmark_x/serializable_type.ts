import { ITEM_TYPE_BM, ITEM_TYPE_GROUP, ITEM_TYPE_GROUPBM } from "./constants";
import { Bookmark, Group, GroupBookmark, RootGroup, } from "./functional_types";

interface BaseSerializable {
    name: string;
    uri: string;
    type: string;
    }

export type SerializableNodeType = SerializableBookmark | SerializableGroup | SerializableGroupBookmark;

function getSerializableBuildFactory(item_type: string) {
    if (item_type === ITEM_TYPE_BM) {
        return SerializableBookmark;
    } else if (item_type === ITEM_TYPE_GROUP) {
        return SerializableGroup;
    } else if (item_type === ITEM_TYPE_GROUPBM) {
        return SerializableGroupBookmark;
    } else {
        throw new Error("getSerializableBuildFactory not covered!");
    }
}

export class SerializableGroup implements BaseSerializable {
    name: string;
    color: string;
    uri: string;
    type: string=ITEM_TYPE_GROUP;
    children: (SerializableGroup|SerializableBookmark)[];

    constructor(
        name: string,
        color: string,
        uri: string,
        children: (SerializableGroup|SerializableBookmark)[]
    ) {
        this.name = name;
        this.color = color;
        this.uri = uri;
        this.children = children;
    }
    public static build(obj: any, factory=Group): any {
        let children = obj.children.map( (item: any) => getSerializableBuildFactory(item.type).build(item) );
        return new factory(obj.name, obj.color, obj.uri, children);
    }
    public static buildRoot(obj: any): RootGroup {
        return SerializableGroup.build(obj, RootGroup);
    }
}

export class SerializableBookmark implements BaseSerializable {
    fsPath: string;
    line: number;
    col: number;
    name: string;
    type: string=ITEM_TYPE_BM;
    lineText: string;
    uri: string;

    constructor(
        fsPath: string,
        line: number,
        col: number,
        name: string,
        lineText: string,
        uri: string
    ) {
        this.fsPath = fsPath;
        this.line = line;
        this.col = col;
        this.name = name;
        this.lineText = lineText;
        this.uri = uri;
    }

    public static build(obj: any): Bookmark {
        return new Bookmark(
            obj.fsPath, obj.line, obj.col, 
            obj.name, obj.lineText, obj.uri
        );
    }
}

export class SerializableGroupBookmark implements BaseSerializable{
    fsPath: string;
    line: number;
    col: number;
    name: string;
    type: string=ITEM_TYPE_GROUPBM;
    lineText: string;
    uri: string;
    color: string;
    children: (SerializableGroup|SerializableBookmark)[];
    constructor(
        group: SerializableGroup,
        bm: SerializableBookmark
    ) {
        this.fsPath = bm.fsPath;
        this.line = bm.line;
        this.col = bm.col;
        this.name = bm.name;
        this.lineText = bm.lineText;
        this.uri = bm.uri;
        this.color = group.color;
        this.children = group.children;
    }

    public static build(obj: any, factory=GroupBookmark): any {
        let children = obj.children.map( (item: any) => getSerializableBuildFactory(item.type).build(item) );
        let group = new Group(obj.name, obj.color, obj.uri, children);
        let bm = new Bookmark( obj.fsPath, obj.line, obj.col, obj.name, obj.lineText, obj.uri );
        return new factory(bm, group);
    }
}

