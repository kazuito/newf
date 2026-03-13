import * as path from "node:path";
import * as vscode from "vscode";

export type Templates = Record<string, string>;

function globToRegex(pattern: string): RegExp {
  let regexStr = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        if (pattern[i + 2] === "/") {
          regexStr += "(?:[^/]+/)*";
          i += 2;
        } else {
          regexStr += ".*";
          i++;
        }
      } else {
        regexStr += "[^/]*";
      }
    } else {
      regexStr += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${regexStr}$`);
}

/** Normalize path separators to POSIX `/` for cross-platform matching. */
export function normalizeTemplatePath(input: string): string {
  return input.replace(/\\/g, "/");
}

/**
 * Returns the template content for a workspace-relative file path, or null
 * if no pattern matches. Patterns without `/` are matched against the
 * basename only; patterns with `/` are matched against the normalized
 * relative path. First matching entry in `templates` wins.
 */
export function resolveTemplate(
  relativePath: string,
  templates: Templates,
): string | null {
  const normalized = normalizeTemplatePath(relativePath);
  const stem = path.basename(normalized, path.extname(normalized));
  const basename = path.basename(normalized);

  for (const [pattern, content] of Object.entries(templates)) {
    const target = pattern.includes("/") ? normalized : basename;
    if (globToRegex(pattern).test(target)) {
      return content.replace(/\$\{name\}/g, stem);
    }
  }
  return null;
}

export function getTemplates(): Templates {
  return (
    vscode.workspace.getConfiguration("newf").get<Templates>("templates") ?? {}
  );
}
