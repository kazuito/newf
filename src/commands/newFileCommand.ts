import * as path from "node:path";
import * as vscode from "vscode";
import { getDirectories } from "../filesystem";
import { pickWorkspaceRoot } from "../pickWorkspaceRoot";
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
  const rootPath = await pickWorkspaceRoot();
  if (!rootPath) return;

  let selectedDir: string;
  if (contextUri) {
    const stat = await vscode.workspace.fs.stat(contextUri);
    const isDir = (stat.type & vscode.FileType.Directory) !== 0;
    const targetPath = isDir
      ? contextUri.fsPath
      : path.dirname(contextUri.fsPath);
    const rel = path.relative(rootPath, targetPath);
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
