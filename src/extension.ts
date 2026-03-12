import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand("newf.create", () => {
		vscode.window.showInformationMessage("Hello World from newf!");
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
