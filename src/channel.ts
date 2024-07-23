import * as vscode from "vscode";
let chan: vscode.OutputChannel;
chan = vscode.window.createOutputChannel('bmx');
export {
  chan
}