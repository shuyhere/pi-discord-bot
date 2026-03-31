import type { TreeBrowserData } from "./agent-tree.js";
import type { DiscordContext } from "./discord.js";

export interface AgentRunner {
  run(ctx: DiscordContext): Promise<{ stopReason: string; errorMessage?: string }>;
  abort(): void;
  newSession(): Promise<void>;
  renameSession(name: string): void;
  getSessionInfo(): string;
  getSessionCardData(): { title: string; fields: Array<{ name: string; value: string; inline?: boolean }> };
  getTreeSummary(): string;
  getTreeBrowserData(): TreeBrowserData;
  navigateTree(targetId: string): Promise<string>;
  listModels(search?: string): string;
  currentModel(): string;
  setModel(reference: string): Promise<string>;
  getScopedModels(): string;
  setScopedModels(patterns: string): string;
  clearScopedModels(): string;
  compact(customInstructions?: string): Promise<string>;
  reload(): Promise<string>;
  getSettingsSummary(): string;
  cycleThinkingSetting(): string;
  cycleTransportSetting(): string;
  toggleSteeringModeSetting(): string;
  toggleFollowUpModeSetting(): string;
  toggleAutoCompactSetting(): string;
}

export interface RunState {
  ctx: DiscordContext | null;
  queue: Promise<void>;
  stopReason: string;
  errorMessage?: string;
  pendingTools: Map<string, { toolName: string; label: string; args: unknown; startedAt: number }>;
}
