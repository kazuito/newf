import * as vscode from "vscode";
import { newFileAtRootCommand } from "./commands/newFileAtRootCommand";
import { newFileCommand } from "./commands/newFileCommand";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("newf.newFile", newFileCommand),
    vscode.commands.registerCommand("newf.newFileAtRoot", newFileAtRootCommand),
  );
}

export function deactivate() {}
