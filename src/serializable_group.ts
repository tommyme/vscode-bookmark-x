import {Group} from './group';

export class SerializableGroup {
    name: string;
    color: string;

    constructor(
        name: string,
        color: string,
    ) {
        this.name = name;
        this.color = color;
    }

    public static fromGroup(group: Group): SerializableGroup {
        return new SerializableGroup(
            group.name,
            group.color,
        );
    }
}