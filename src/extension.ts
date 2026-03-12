import * as path from "node:path";
import * as vscode from "vscode";
import { createFile, getDirectories } from "./filesystem";
import { expandInput } from "./parsing";

function makeValidateInput(
  validateInput: (value: string) =>
    | {
        message: string;
        severity: vscode.InputBoxValidationSeverity;
      }
    | null
    | undefined,
) {
  return validateInput;
}

const patternValidateInput = makeValidateInput((value: string) => {
  if (!value.trim()) return null;
  try {
    const names = expandInput(value);
    if (names.length > 1) {
      return {
        message: `Will create ${names.length} files`,
        severity: vscode.InputBoxValidationSeverity.Info,
      };
    }
    return null;
  } catch (err) {
    return {
      message: err instanceof Error ? err.message : "Invalid pattern",
      severity: vscode.InputBoxValidationSeverity.Error,
    };
  }
});

async function pickDirectory(
  rootPath: string,
  dirs: string[],
): Promise<string | undefined> {
  const items = dirs.map((d) => ({ label: d }));
  const qp = vscode.window.createQuickPick<vscode.QuickPickItem>();
  qp.items = items;
  qp.placeholder = "Select a directory";

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const rel = path.relative(
      rootPath,
      path.dirname(activeEditor.document.uri.fsPath),
    );
    const activeItem = items.find((i) => i.label === (rel || "."));
    if (activeItem) qp.activeItems = [activeItem];
  }

  qp.show();
  return new Promise<string | undefined>((resolve) => {
    qp.onDidAccept(() => {
      resolve(qp.selectedItems[0]?.label);
      qp.dispose();
    });
    qp.onDidHide(() => {
      resolve(undefined);
      qp.dispose();
    });
  });
}

async function runCreate(basePath: string, input: string): Promise<void> {
  let fileNames: string[];
  try {
    fileNames = expandInput(input);
  } catch (err) {
    vscode.window.showErrorMessage(
      err instanceof Error ? err.message : "Invalid input pattern.",
    );
    return;
  }

  const created: string[] = [];
  const failed: string[] = [];

  for (const raw of fileNames) {
    try {
      created.push(await createFile(basePath, raw));
    } catch (err) {
      failed.push(
        `"${raw}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (created.length === 1) {
    const doc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(created[0]),
    );
    await vscode.window.showTextDocument(doc);
  } else if (created.length > 1) {
    const last = await vscode.workspace.openTextDocument(
      vscode.Uri.file(created[created.length - 1]),
    );
    await vscode.window.showTextDocument(last);
    vscode.window.showInformationMessage(`Created ${created.length} files.`);
  }

  for (const msg of failed) {
    vscode.window.showErrorMessage(`Failed to create ${msg}`);
  }
}

async function createFileCommand(contextUri?: vscode.Uri) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;

  let selectedDir: string;
  if (contextUri) {
    const rel = path.relative(rootPath, contextUri.fsPath);
    selectedDir = rel || ".";
  } else {
    const dirs = await getDirectories(rootPath);
    const picked = await pickDirectory(rootPath, dirs);
    if (!picked) return;
    selectedDir = picked;
  }

  const input = await vscode.window.showInputBox({
    prompt: `Create in "${selectedDir}" — supports brace expansion (e.g. {a,b}.md, {01..05}.md)`,
    placeHolder: "file name or pattern (e.g. components/{Header,Footer}.tsx)",
    validateInput: patternValidateInput,
  });
  if (!input) return;

  const basePath = path.join(rootPath, selectedDir);
  await runCreate(basePath, input);
}

async function createFileAtRootCommand() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;

  const input = await vscode.window.showInputBox({
    prompt: "Path from workspace root — supports brace expansion",
    placeHolder: "e.g. src/components/{Header,Footer}.tsx",
    validateInput: patternValidateInput,
  });
  if (!input) return;

  await runCreate(rootPath, input);
}

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
