import * as clipboardy from "clipboardy";

export function copy(content: string){
  clipboardy.writeSync(content);
}