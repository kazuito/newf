import { expand } from "brace-expansion";

export function splitTopLevelCommas(input: string): string[] {
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

export function expandInput(input: string): string[] {
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
