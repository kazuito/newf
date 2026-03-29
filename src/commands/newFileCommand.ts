import * as path from "node:path";
import * as vscode from "vscode";
import { createFile, getDirectories } from "../filesystem";
import { pickWorkspaceRoot } from "../pickWorkspaceRoot";
import { runCreate } from "../runCreate";
import { patternValidateInput } from "../validate";

/** Normalize typed directory input: trim, strip leading `./`, strip trailing slashes. */
export function normalizeDirInput(typed: string): string {
  let s = typed.trim().replace(/\\/g, "/");
  while (s.startsWith("./")) {
    s = s.slice(2);
  }
  s = s.replace(/\/+/g, "/");
  s = s.replace(/\/+$/, "");
  return s;
}

function toPlatformRelativePath(input: string): string {
  return input.replace(/\//g, path.sep);
}

/**
 * Returns true when a synthetic "Create directory" item should be shown.
 * Suppressed when: empty, `.`, already exists in dirs, absolute path,
 * or traversal outside rootPath.
 */
export function shouldShowCreateItem(
  normalized: string,
  dirs: string[],
  rootPath: string,
): boolean {
  if (!normalized || normalized === ".") return false;
  const normalizedDirs = new Set(dirs.map(normalizeDirInput));
  if (normalizedDirs.has(normalized)) return false;
  const platformPath = toPlatformRelativePath(normalized);
  if (path.isAbsolute(platformPath)) return false;
  const resolved = path.resolve(rootPath, platformPath);
  return resolved.startsWith(rootPath + path.sep);
}

interface CreateDirItem extends vscode.QuickPickItem {
  _isCreate: true;
  relPath: string;
}

async function pickDirectory(
  rootPath: string,
  dirs: string[],
): Promise<string | undefined> {
  const staticItems = dirs.map((d) => ({ label: d }));
  const qp = vscode.window.createQuickPick<
    vscode.QuickPickItem | CreateDirItem
  >();
  qp.items = staticItems;
  qp.placeholder = vscode.l10n.t(
    "Select a directory or type a new one to create",
  );

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const rel = path.relative(
      rootPath,
      path.dirname(activeEditor.document.uri.fsPath),
    );
    const activeItem = staticItems.find((i) => i.label === (rel || "."));
    if (activeItem) qp.activeItems = [activeItem];
  }

  qp.onDidChangeValue((typed) => {
    const normalized = normalizeDirInput(typed);
    if (!shouldShowCreateItem(normalized, dirs, rootPath)) {
      qp.items = staticItems;
      return;
    }
    const createItem: CreateDirItem = {
      label: vscode.l10n.t('$(plus) Create directory "{0}"', normalized),
      description: path.join(rootPath, toPlatformRelativePath(normalized)),
      _isCreate: true,
      relPath: normalized,
      alwaysShow: true,
    };
    qp.items = [createItem, ...staticItems];
    qp.activeItems = [createItem];
  });

  qp.show();

  return new Promise<string | undefined>((resolve) => {
    qp.onDidAccept(async () => {
      const selected = qp.selectedItems[0] as
        | (vscode.QuickPickItem | CreateDirItem)
        | undefined;
      if (!selected) {
        resolve(undefined);
        qp.dispose();
        return;
      }

      if ("_isCreate" in selected) {
        // Re-check traversal at accept time (defense in depth)
        if (!shouldShowCreateItem(selected.relPath, dirs, rootPath)) {
          vscode.window.showErrorMessage(
            vscode.l10n.t(
              'Cannot create directory outside workspace: "{0}"',
              selected.relPath,
            ),
          );
          resolve(undefined);
          qp.dispose();
          return;
        }
        try {
          await createFile(
            rootPath,
            toPlatformRelativePath(selected.relPath) + path.sep,
          );
          resolve(selected.relPath);
        } catch (err) {
          vscode.window.showErrorMessage(
            vscode.l10n.t(
              "Failed to create directory: {0}",
              err instanceof Error ? err.message : String(err),
            ),
          );
          resolve(undefined);
        }
        qp.dispose();
        return;
      }

      resolve(selected.label);
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
    const respectGitignore = vscode.workspace
      .getConfiguration("newf")
      .get<boolean>("respectGitignore", true);
    const dirs = await getDirectories(rootPath, respectGitignore);
    const picked = await pickDirectory(rootPath, dirs);
    if (!picked) return;
    selectedDir = picked;
  }

  const input = await vscode.window.showInputBox({
    prompt: vscode.l10n.t(
      'Create in "{0}" — supports brace expansion (e.g. {{a,b}}.md, {{01..05}}.md)',
      selectedDir,
    ),
    placeHolder: vscode.l10n.t(
      "file name or pattern (e.g. components/{{Header,Footer}}.tsx)",
    ),
    validateInput: patternValidateInput,
  });
  if (!input) return;

  const basePath = path.join(rootPath, selectedDir);
  await runCreate(rootPath, basePath, input);
}
