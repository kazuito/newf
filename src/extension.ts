import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { expand } from "brace-expansion";
import * as vscode from "vscode";

const execFileAsync = promisify(execFile);

async function getDirectories(rootPath: string): Promise<string[]> {
	const dirs = new Set<string>();
	dirs.add(".");

	try {
		// Use git to list all non-ignored directories
		const { stdout } = await execFileAsync(
			"git",
			["ls-files", "--others", "--cached", "--directory", "--exclude-standard"],
			{ cwd: rootPath, maxBuffer: 10 * 1024 * 1024 },
		);

		for (const line of stdout.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed) {
				continue;
			}

			// Collect every directory segment in the path
			const filePath = trimmed.endsWith("/")
				? trimmed.slice(0, -1)
				: path.dirname(trimmed);
			if (filePath === ".") {
				continue;
			}

			// Add the directory and all parent directories
			let current = filePath;
			while (current && current !== ".") {
				if (!current.startsWith(".")) {
					dirs.add(current);
				}
				current = path.dirname(current);
			}
		}
	} catch {
		// Fallback: not a git repo, walk the filesystem
		await walkDirectories(rootPath, rootPath, dirs);
	}

	return [...dirs].sort();
}

async function walkDirectories(
	rootPath: string,
	currentPath: string,
	dirs: Set<string>,
): Promise<void> {
	const entries = await fs.promises.readdir(currentPath, {
		withFileTypes: true,
	});
	for (const entry of entries) {
		if (
			entry.isDirectory() &&
			!entry.name.startsWith(".") &&
			entry.name !== "node_modules"
		) {
			const fullPath = path.join(currentPath, entry.name);
			const relativePath = path.relative(rootPath, fullPath);
			dirs.add(relativePath);
			await walkDirectories(rootPath, fullPath, dirs);
		}
	}
}

function splitTopLevelCommas(input: string): string[] {
	const segments: string[] = [];
	let depth = 0;
	let current = "";
	for (const ch of input) {
		if (ch === "{") {
			depth++;
			current += ch;
		} else if (ch === "}") {
			depth = Math.max(0, depth - 1);
			current += ch;
		} else if (ch === "," && depth === 0) {
			segments.push(current);
			current = "";
		} else {
			current += ch;
		}
	}
	segments.push(current);
	return segments;
}

function expandInput(input: string): string[] {
	const segments = splitTopLevelCommas(input);
	const results: string[] = [];
	for (const segment of segments) {
		const trimmed = segment.trim();
		if (trimmed) {
			results.push(...expand(trimmed));
		}
	}
	return [...new Set(results)];
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
		prompt:
			"Enter file name(s) — supports brace expansion (e.g. {a,b}.md, {01..05}.md)",
		placeHolder: "file name or pattern (e.g. components/{Header,Footer}.tsx)",
	});
	if (!input) {
		return;
	}

	const basePath = path.join(rootPath, selectedDir);
	const fileNames = expandInput(input);

	for (const raw of fileNames) {
		let fileName = raw;
		if (fileName.startsWith("/")) {
			fileName = fileName.slice(1);
		}

		const fullPath = path.resolve(basePath, fileName);

		const dir = path.dirname(fullPath);
		await fs.promises.mkdir(dir, { recursive: true });

		if (!fs.existsSync(fullPath)) {
			await fs.promises.writeFile(fullPath, "");
		}

		const doc = await vscode.workspace.openTextDocument(
			vscode.Uri.file(fullPath),
		);
		await vscode.window.showTextDocument(doc);
	}
}

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand(
		"newf.create",
		createFileCommand,
	);

	context.subscriptions.push(disposable);
}

export function deactivate() {}
