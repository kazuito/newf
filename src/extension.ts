import * as vscode from "vscode";
import { createFileAtRootCommand } from "./commands/createFileAtRootCommand";
import { createFileCommand } from "./commands/createFileCommand";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("newf.newFile", createFileCommand),
    vscode.commands.registerCommand(
      "newf.newFileAtRoot",
      createFileAtRootCommand,
    ),
  );
}

export function deactivate() {}
