import * as vscode from "vscode";
import { createFileAtRootCommand } from "./commands/createFileAtRootCommand";
import { createFileCommand } from "./commands/createFileCommand";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("newf.create", createFileCommand),
    vscode.commands.registerCommand(
      "newf.createAtRoot",
      createFileAtRootCommand,
    ),
  );
}

export function deactivate() {}
