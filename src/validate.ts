import * as vscode from "vscode";
import { expandInput } from "./parsing";

export const patternValidateInput = (value: string) => {
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
};
