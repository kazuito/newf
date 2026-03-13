import * as vscode from "vscode";
import { expandInput } from "./parsing";

function isDirectoryIntent(name: string): boolean {
  return name.endsWith("/") || name.endsWith("\\");
}

function formatCount(count: number, singular: string, plural: string): string {
  return count === 1
    ? vscode.l10n.t("1 {0}", singular)
    : vscode.l10n.t("{0} {1}", count, plural);
}

function buildSummary(files: number, folders: number): string | null {
  if (folders === 0) {
    return files > 1 ? formatCount(files, "file", "files") : null;
  }
  if (files === 0) {
    return formatCount(folders, "folder", "folders");
  }
  return vscode.l10n.t(
    "{0} ({1}, {2})",
    formatCount(files + folders, "item", "items"),
    formatCount(files, "file", "files"),
    formatCount(folders, "folder", "folders"),
  );
}

export const patternValidateInput = (value: string) => {
  if (!value.trim()) return null;
  try {
    const names = expandInput(value);
    const folders = names.filter(isDirectoryIntent).length;
    const files = names.length - folders;
    const summary = buildSummary(files, folders);

    if (summary) {
      const preview = names.slice(0, 5).join(", ");
      const suffix =
        names.length > 5
          ? ` ${vscode.l10n.t("(+{0} more)", names.length - 5)}`
          : "";
      return {
        message: vscode.l10n.t(
          "Will create {0}: {1}{2}",
          summary,
          preview,
          suffix,
        ),
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
};
