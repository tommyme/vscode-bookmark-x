import { Bookmark, Group, RootGroup } from "./functional_types";

interface BaseSerializable {
    name: string;
    uri: string;
    type: string;
}
export class SerializableGroup implements BaseSerializable {
    name: string;
    color: string;
    uri: string;
    type: string="group";
    children: (SerializableGroup|SerializableBookmark)[]

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
    public static build(obj: any, Factory=Group): any {
        let curr_lv_bookmarks: Bookmark[] = []

        let children = obj.children.map((item: any) => {
            let res;
            if (item.type == 'bookmark') {
                res = SerializableBookmark.build(item)
                curr_lv_bookmarks.push(res)
            } else if (item.type == 'group') {
                res = SerializableGroup.build(item)
            }
            return res
        })
        let build_out_group = new Factory(obj.name, obj.color, obj.uri, children)
        curr_lv_bookmarks.forEach(bookmark => {
            bookmark.group = build_out_group
        })
        return build_out_group
    }
    public static build_root(obj: any): RootGroup {
        return SerializableGroup.build(obj, RootGroup)
    }
}

export class SerializableBookmark implements BaseSerializable {
    fsPath: string;
    line: number;
    col: number;
    name: string;
    type: string="bookmark";
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
        )
    }
}
