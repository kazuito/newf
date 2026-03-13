import * as vscode from "vscode";
import { expandInput } from "./parsing";

export const patternValidateInput = (value: string) => {
  if (!value.trim()) return null;
  try {
    const names = expandInput(value);
    if (names.length > 1) {
      const preview = names.slice(0, 5).join(", ");
      const suffix =
        names.length > 5
          ? ` ${vscode.l10n.t("(+{0} more)", names.length - 5)}`
          : "";
      return {
        message: vscode.l10n.t(
          "Will create {0} files: {1}{2}",
          names.length,
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
