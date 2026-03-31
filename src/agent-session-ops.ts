import type { ModelRegistry, SettingsManager } from "@mariozechner/pi-coding-agent";
import type { AgentSession } from "@mariozechner/pi-coding-agent";
import { flattenTreeNodes, summarizeTreeNode, type TreeBrowserData } from "./agent-tree.js";
import { findModelByReference, formatModel, modelSortKey, resolveScopedModels } from "./agent-models.js";
import type { AgentRunner, RunState } from "./agent-types.js";

export function createSessionOps(params: {
  session: AgentSession;
  sessionManager: any;
  modelRegistry: ModelRegistry;
  settingsManager: SettingsManager;
  runState: RunState;
}): Omit<AgentRunner, "run" | "abort"> {
  const { session, sessionManager, modelRegistry, settingsManager, runState } = params;

  return {
    async newSession(): Promise<void> {
      await session.newSession();
      runState.pendingTools.clear();
    },
    renameSession(name: string): void {
      session.setSessionName(name);
    },
    getSessionInfo(): string {
      const card = this.getSessionCardData();
      return [card.title, ...card.fields.map((field) => `${field.name}: ${field.value}`)].join("\n");
    },
    getTreeSummary(): string {
      const roots = sessionManager.getTree();
      if (roots.length === 0) return "Session tree is empty.";
      return summarizeTreeNode({ entry: { id: "root", type: "root" }, children: roots }, 0, []).slice(1).join("\n");
    },
    getTreeBrowserData(): TreeBrowserData {
      const roots = sessionManager.getTree();
      const currentId = sessionManager.getLeafId() ?? undefined;
      const entries = flattenTreeNodes(roots, currentId ?? null);
      return {
        title: session.sessionName ? `Session tree · ${session.sessionName}` : "Session tree",
        description: entries.length === 0
          ? "This session tree is empty."
          : [currentId ? `**Current leaf**: \`${currentId}\`` : "**Current leaf**: none", `**Entries**: ${entries.length}`, "Use the dropdown to navigate to a different entry."].join("\n"),
        entries,
        currentId,
      };
    },
    async navigateTree(targetId: string): Promise<string> {
      const result = await session.navigateTree(targetId, { summarize: false });
      if (result.cancelled) return `Navigation to ${targetId} was cancelled.`;
      return `Moved session tree leaf to ${targetId}.`;
    },
    getSessionCardData(): { title: string; fields: Array<{ name: string; value: string; inline?: boolean }> } {
      const stats = session.getSessionStats();
      return {
        title: session.sessionName ? `Session · ${session.sessionName}` : "Session",
        fields: [
          { name: "Model", value: formatModel(session.model), inline: false },
          { name: "File", value: stats.sessionFile ?? "In-memory", inline: false },
          { name: "ID", value: stats.sessionId, inline: false },
          { name: "Messages", value: `user ${stats.userMessages} · assistant ${stats.assistantMessages} · tools ${stats.toolCalls}`, inline: false },
          { name: "Tokens", value: `in ${stats.tokens.input} · out ${stats.tokens.output} · total ${stats.tokens.total}`, inline: false },
          { name: "Cost", value: `$${stats.cost.toFixed(4)}`, inline: true },
          { name: "Thinking", value: settingsManager.getDefaultThinkingLevel() ?? "off", inline: true },
          { name: "Transport", value: settingsManager.getTransport(), inline: true },
          { name: "Scoped models", value: session.scopedModels.length > 0 ? session.scopedModels.map((item) => `${item.model.provider}/${item.model.id}`).join("\n") : "All available models", inline: false },
        ],
      };
    },
    listModels(search?: string): string {
      const query = search?.trim().toLowerCase();
      const models = modelRegistry.getAvailable()
        .filter((model) => !query || `${model.provider}/${model.id}`.toLowerCase().includes(query) || model.id.toLowerCase().includes(query))
        .sort((a, b) => {
          const [ap, ak] = modelSortKey(a);
          const [bp, bk] = modelSortKey(b);
          return ap - bp || ak.localeCompare(bk);
        });
      if (models.length === 0) return query ? `No available models match \`${search}\`.` : "No available models. Authenticate with Pi first.";
      return models.map((model) => `${session.model && session.model.provider === model.provider && session.model.id === model.id ? "*" : "-"} ${model.provider}/${model.id}`).join("\n");
    },
    currentModel(): string {
      return formatModel(session.model);
    },
    async setModel(reference: string): Promise<string> {
      modelRegistry.refresh();
      const resolved = findModelByReference(modelRegistry, reference);
      if (!resolved.model) throw new Error(resolved.error ?? "Model not found.");
      await session.setModel(resolved.model);
      return formatModel(session.model);
    },
    getScopedModels(): string {
      if (session.scopedModels.length === 0) return "Scoped models: all available models";
      return `Scoped models:\n${session.scopedModels.map((item) => `- ${item.model.provider}/${item.model.id}`).join("\n")}`;
    },
    setScopedModels(patterns: string): string {
      const list = patterns.split(",").map((item) => item.trim()).filter(Boolean);
      if (list.length === 0) return "Usage: /scoped-models <pattern[,pattern...]>";
      modelRegistry.refresh();
      const resolved = resolveScopedModels(modelRegistry, list);
      if (resolved.length === 0) return `No available models matched: ${list.join(", ")}`;
      settingsManager.setEnabledModels(list);
      session.setScopedModels(resolved);
      return `Scoped models set:\n${resolved.map((item) => `- ${item.model.provider}/${item.model.id}`).join("\n")}`;
    },
    clearScopedModels(): string {
      settingsManager.setEnabledModels(undefined);
      session.setScopedModels([]);
      return "Cleared scoped models. Pi will use all available models.";
    },
    async compact(customInstructions?: string): Promise<string> {
      await session.compact(customInstructions || undefined);
      return "Compaction complete.";
    },
    async reload(): Promise<string> {
      modelRegistry.refresh();
      await session.reload();
      return "Reloaded settings, skills, prompts, extensions, and model registry.";
    },
    getSettingsSummary(): string {
      return [
        `Transport: ${settingsManager.getTransport()}`,
        `Thinking: ${settingsManager.getDefaultThinkingLevel() ?? "off"}`,
        `Steering mode: ${settingsManager.getSteeringMode()}`,
        `Follow-up mode: ${settingsManager.getFollowUpMode()}`,
        `Auto compact: ${settingsManager.getCompactionEnabled() ? "on" : "off"}`,
      ].join("\n");
    },
    cycleThinkingSetting(): string {
      const order: Array<"off" | "minimal" | "low" | "medium" | "high" | "xhigh"> = ["off", "minimal", "low", "medium", "high", "xhigh"];
      const current = settingsManager.getDefaultThinkingLevel() ?? "off";
      const next = order[(order.indexOf(current) + 1) % order.length];
      settingsManager.setDefaultThinkingLevel(next);
      session.setThinkingLevel(next);
      return this.getSettingsSummary();
    },
    cycleTransportSetting(): string {
      const order = ["auto", "sse", "websocket"] as const;
      const current = settingsManager.getTransport();
      const next = order[(order.indexOf(current as typeof order[number]) + 1 + order.length) % order.length];
      settingsManager.setTransport(next);
      return this.getSettingsSummary();
    },
    toggleSteeringModeSetting(): string {
      const next = settingsManager.getSteeringMode() === "all" ? "one-at-a-time" : "all";
      settingsManager.setSteeringMode(next);
      session.setSteeringMode(next);
      return this.getSettingsSummary();
    },
    toggleFollowUpModeSetting(): string {
      const next = settingsManager.getFollowUpMode() === "all" ? "one-at-a-time" : "all";
      settingsManager.setFollowUpMode(next);
      session.setFollowUpMode(next);
      return this.getSettingsSummary();
    },
    toggleAutoCompactSetting(): string {
      const next = !settingsManager.getCompactionEnabled();
      settingsManager.setCompactionEnabled(next);
      session.setAutoCompactionEnabled(next);
      return this.getSettingsSummary();
    },
  };
}
