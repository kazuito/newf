import * as path from "node:path";
import * as vscode from "vscode";
import { getDirectories } from "../filesystem";
import { runCreate } from "../runCreate";
import { patternValidateInput } from "../validate";

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

export async function newFileCommand(contextUri?: vscode.Uri) {
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
