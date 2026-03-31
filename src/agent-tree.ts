export interface TreeBrowserEntry {
  id: string;
  depth: number;
  type: string;
  preview: string;
  label?: string;
  isCurrent: boolean;
}

export interface TreeBrowserData {
  title: string;
  description: string;
  entries: TreeBrowserEntry[];
  currentId?: string;
}

function truncate(text: string, max = 1800): string {
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

export function getTreeEntryPreview(entry: any): string {
  if (entry.type === "message") {
    const role = entry.message?.role ?? "unknown";
    const content = typeof entry.message?.content === "string"
      ? entry.message.content
      : Array.isArray(entry.message?.content)
        ? entry.message.content.filter((part: any) => part?.type === "text").map((part: any) => part.text).join("\n")
        : "";
    return `${role} — ${truncate(String(content).replace(/\s+/g, " "), 80)}`;
  }
  if (entry.type === "branch_summary") return `branch summary — ${truncate(entry.summary ?? "", 80)}`;
  if (entry.type === "compaction") return `compaction — ${truncate(entry.summary ?? "", 80)}`;
  if (entry.type === "model_change") return `model change — ${entry.provider}/${entry.modelId}`;
  if (entry.type === "thinking_level_change") return `thinking — ${entry.thinkingLevel}`;
  if (entry.type === "label") return `label — ${entry.label ?? "(cleared)"}`;
  if (entry.type === "session_info") return `session info — ${entry.name ?? "(unnamed)"}`;
  return `${entry.type} ${entry.id}`;
}

export function summarizeTreeNode(node: any, depth = 0, lines: string[] = []): string[] {
  const indent = "  ".repeat(depth);
  const entry = node.entry as any;
  let title = `${getTreeEntryPreview(entry)} (${entry.id})`;
  if (node.label) title += ` [${node.label}]`;
  lines.push(`${indent}- ${title}`);
  for (const child of node.children ?? []) summarizeTreeNode(child, depth + 1, lines);
  return lines;
}

export function flattenTreeNodes(nodes: any[], currentId: string | null, depth = 0, out: TreeBrowserEntry[] = []): TreeBrowserEntry[] {
  for (const node of nodes) {
    out.push({
      id: node.entry.id,
      depth,
      type: node.entry.type,
      preview: getTreeEntryPreview(node.entry),
      label: node.label,
      isCurrent: node.entry.id === currentId,
    });
    flattenTreeNodes(node.children ?? [], currentId, depth + 1, out);
  }
  return out;
}
