import {DecorationFactory} from './decoration_factory';
import {TextEditorDecorationType} from 'vscode';
import {SerializableGroup} from './serializable_group';

export class Group {
    name: string;
    color: string;
    decoration: TextEditorDecorationType | null;
    groupDecorationUpdatedHandler: (group: Group) => void;
    
    constructor(
        name: string,
        color: string,
    ) {
        this.name = name;
        this.color = color;
        this.decoration = null;
        this.groupDecorationUpdatedHandler = () => {};
    }

    public onGroupDecorationUpdated(fn: (group: Group) => void) {
        this.groupDecorationUpdatedHandler = fn;
    }

    public static fromSerializableGroup(group: SerializableGroup): Group {
        return new Group(
            group.name,
            group.color,
        );
    }

    public async initDecorations() {
        [this.decoration] = await DecorationFactory.create(this.color);
        this.groupDecorationUpdatedHandler(this);
    }

    public getDecoration() {
        return this.decoration;
    }
}