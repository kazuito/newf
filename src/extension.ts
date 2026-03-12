import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

async function getDirectories(rootPath: string): Promise<string[]> {
	const entries = await fs.promises.readdir(rootPath, { withFileTypes: true });
	const dirs: string[] = ["."];
	for (const entry of entries) {
		if (entry.isDirectory() && !entry.name.startsWith(".")) {
			dirs.push(entry.name);
		}
	}
	return dirs;
}

async function createFileCommand() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage("No workspace folder is open.");
		return;
	}

	const rootPath = workspaceFolders[0].uri.fsPath;

	const dirs = await getDirectories(rootPath);
	const selectedDir = await vscode.window.showQuickPick(dirs, {
		placeHolder: "Select a directory",
	});
	if (!selectedDir) {
		return;
	}

	const input = await vscode.window.showInputBox({
		prompt: "Enter file name (e.g. hello.md, hey/hello/world.md)",
		placeHolder: "file name or path",
	});
	if (!input) {
		return;
	}

	let fileName = input;
	if (fileName.startsWith("/")) {
		fileName = fileName.slice(1);
	}

	const basePath = path.join(rootPath, selectedDir);
	const fullPath = path.resolve(basePath, fileName);

	const dir = path.dirname(fullPath);
	await fs.promises.mkdir(dir, { recursive: true });

	if (!fs.existsSync(fullPath)) {
		await fs.promises.writeFile(fullPath, "");
	}

	const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fullPath));
	await vscode.window.showTextDocument(doc);
}

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand("newf.create", createFileCommand);

	context.subscriptions.push(disposable);
}

export function deactivate() {}
