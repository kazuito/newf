import * as path from "node:path";
import * as vscode from "vscode";

export type Templates = Record<string, string>;
type TemplateVariableName =
  | "basename"
  | "date"
  | "dir"
  | "ext"
  | "name"
  | "workspaceFolder";
type TemplateVariables = Record<TemplateVariableName, string>;

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

function formatLocalDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTemplateVariables(
  relativePath: string,
  workspaceFolder: string,
  now: Date,
): TemplateVariables {
  const normalizedPath = normalizeTemplatePath(relativePath);
  const basename = path.posix.basename(normalizedPath);
  const ext = path.posix.extname(normalizedPath);

  return {
    basename,
    date: formatLocalDate(now),
    dir: path.posix.dirname(normalizedPath),
    ext,
    name: path.posix.basename(normalizedPath, ext),
    workspaceFolder: normalizeTemplatePath(workspaceFolder),
  };
}

function substituteTemplateVariables(
  content: string,
  variables: TemplateVariables,
): string {
  return content.replace(
    /\$\{(basename|date|dir|ext|name|workspaceFolder)\}/g,
    (_, key: TemplateVariableName) => variables[key],
  );
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
  workspaceFolder: string,
  now = new Date(),
): string | null {
  const normalized = normalizeTemplatePath(relativePath);
  const basename = path.posix.basename(normalized);
  const variables = getTemplateVariables(normalized, workspaceFolder, now);

  for (const [pattern, content] of Object.entries(templates)) {
    const target = pattern.includes("/") ? normalized : basename;
    if (globToRegex(pattern).test(target)) {
      return substituteTemplateVariables(content, variables);
    }
  }
  return null;
}

export function getTemplates(): Templates {
  return (
    vscode.workspace.getConfiguration("newf").get<Templates>("templates") ?? {}
  );
}
