import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type MessageCreateOptions,
} from "discord.js";
import type { TreeBrowserData } from "./agent-tree.js";

export function formatWorkingText(text: string, working: boolean): string {
  return working ? `${text}\n\n...` : text;
}

export function chunkText(text: string, max = 1900): string[] {
  if (text.length <= max) return [text];

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = remaining.lastIndexOf(" ", max);
    if (cut < max * 0.5) cut = max;
    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

export function truncate(text: string, max = 180): string {
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

export async function sendOrEditAnchor(params: {
  slashInteraction: ChatInputCommandInteraction | null;
  sendable: any;
  replyMessageId: string | null;
  text: string;
}): Promise<{ replyMessageId: string }> {
  const { slashInteraction, sendable, text } = params;

  if (slashInteraction) {
    if (params.replyMessageId) {
      await slashInteraction.editReply(text);
      return { replyMessageId: params.replyMessageId };
    }
    const response = await slashInteraction.editReply(text);
    return { replyMessageId: response.id };
  }

  if (params.replyMessageId) {
    const message = await sendable.messages.fetch(params.replyMessageId);
    await message.edit(text);
    return { replyMessageId: params.replyMessageId };
  }

  const sent = await sendable.send(text as string | MessageCreateOptions);
  return { replyMessageId: sent.id };
}

export function buildModelSelectionCard(params: { currentModel: string; models: string[]; title?: string; page?: number; messageId: string }) {
  const page = params.page ?? 0;
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(params.models.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), pageCount - 1);
  const start = safePage * pageSize;
  const pageModels = params.models.slice(start, start + pageSize);
  const customId = `model:${params.messageId}:${Date.now()}:select`;
  const options = pageModels.map((value) => ({ label: value.slice(0, 100), value, default: value === params.currentModel }));
  const embed = new EmbedBuilder()
    .setTitle(`🤖 ${params.title ?? "Select a model"}`)
    .setDescription([
      `> **Current model**\n> \`${params.currentModel}\``,
      pageCount > 1 ? `📄 Page **${safePage + 1}** of **${pageCount}** · ${params.models.length} models available` : `${params.models.length} models available`,
      "Use the dropdown to pick a model" + (pageCount > 1 ? ", or **Prev / Next** to browse." : "."),
    ].join("\n\n"))
    .setColor(0x5865F2)
    .setFooter({ text: "Selection expires in 2 minutes" })
    .setTimestamp();
  const rows: Array<ActionRowBuilder<any>> = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder("Choose a model").addOptions(options),
    ),
  ];

  const prevId = `model:${params.messageId}:${Date.now()}:prev`;
  const nextId = `model:${params.messageId}:${Date.now()}:next`;
  const closeId = `model:${params.messageId}:${Date.now()}:close`;
  if (pageCount > 1) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(prevId).setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(safePage === 0),
      new ButtonBuilder().setCustomId(`model:${params.messageId}:${Date.now()}:page`).setLabel(`Page ${safePage + 1}/${pageCount}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId(nextId).setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(safePage >= pageCount - 1),
      new ButtonBuilder().setCustomId(closeId).setLabel("Done").setStyle(ButtonStyle.Success),
    ));
  }

  return { embed, rows, ids: { customId, prevId, nextId, closeId }, pageCount };
}

export function buildScopedModelSelectionCard(params: { currentModels: string[]; models: string[]; page?: number; messageId: string }) {
  const page = params.page ?? 0;
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(params.models.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), pageCount - 1);
  const start = safePage * pageSize;
  const pageModels = params.models.slice(start, start + pageSize);
  const customId = `scoped:${params.messageId}:${Date.now()}:select`;
  const options = pageModels.map((value) => ({ label: value.slice(0, 100), value, default: params.currentModels.includes(value) }));
  const embed = new EmbedBuilder()
    .setTitle("🎯 Scoped models")
    .setDescription([
      params.currentModels.length > 0
        ? `> **Current scope**\n${params.currentModels.map((model) => `> • \`${model}\``).join("\n")}`
        : "> **Current scope**\n> All available models",
      pageCount > 1 ? `📄 Page **${safePage + 1}** of **${pageCount}** · ${params.models.length} models available` : `${params.models.length} models available`,
      "Select zero or more models, or browse with **Prev / Next**.",
    ].join("\n\n"))
    .setColor(0x57F287)
    .setFooter({ text: "Selection expires in 2 minutes" })
    .setTimestamp();
  const rows: Array<ActionRowBuilder<any>> = [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder("Select scoped models").setMinValues(0).setMaxValues(options.length).addOptions(options),
    ),
  ];

  const prevId = `scoped:${params.messageId}:${Date.now()}:prev`;
  const nextId = `scoped:${params.messageId}:${Date.now()}:next`;
  const closeId = `scoped:${params.messageId}:${Date.now()}:close`;
  if (pageCount > 1) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(prevId).setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(safePage === 0),
      new ButtonBuilder().setCustomId(`scoped:${params.messageId}:${Date.now()}:page`).setLabel(`Page ${safePage + 1}/${pageCount}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId(nextId).setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(safePage >= pageCount - 1),
      new ButtonBuilder().setCustomId(closeId).setLabel("Done").setStyle(ButtonStyle.Success),
    ));
  }

  return { embed, rows, ids: { customId, prevId, nextId, closeId }, pageCount };
}

export function buildSessionCard(params: { title: string; fields: Array<{ name: string; value: string; inline?: boolean }> }) {
  const embed = new EmbedBuilder().setTitle(params.title);
  for (const field of params.fields) embed.addFields({ name: field.name, value: field.value.slice(0, 1024), inline: field.inline ?? false });
  return embed;
}

export function buildTreeSelectionCard(params: TreeBrowserData & { page?: number; messageId: string }) {
  const page = params.page ?? 0;
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(params.entries.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), pageCount - 1);
  const start = safePage * pageSize;
  const pageEntries = params.entries.slice(start, start + pageSize);
  const customId = `tree:${params.messageId}:${Date.now()}:select`;
  const options = pageEntries.map((entry) => ({
    label: `${entry.isCurrent ? "● " : ""}${"· ".repeat(Math.min(entry.depth, 3))}${entry.preview}`.slice(0, 100),
    description: `${entry.type} · ${entry.id}${entry.label ? ` · ${entry.label}` : ""}`.slice(0, 100),
    value: entry.id,
    default: entry.isCurrent,
  }));
  const descriptionLines = [params.description];
  if (pageEntries.length > 0) {
    descriptionLines.push("", ...pageEntries.map((entry, index) => {
      const prefix = entry.isCurrent ? "**● Current**" : `**${start + index + 1}.**`;
      const indent = "› ".repeat(Math.min(entry.depth, 4));
      return `${prefix} ${indent}\`${entry.id}\`\n${truncate(entry.preview, 140)}${entry.label ? `\n_Label:_ ${entry.label}` : ""}`;
    }));
  }

  const embed = new EmbedBuilder()
    .setTitle(`🌳 ${params.title}`)
    .setDescription(descriptionLines.join("\n").slice(0, 4096))
    .setColor(0xFEE75C)
    .setFooter({ text: `Page ${safePage + 1}/${pageCount} · Selection expires in 2 minutes` })
    .setTimestamp();

  const rows: Array<ActionRowBuilder<any>> = [];
  if (options.length > 0) {
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder("Select an entry to navigate to").addOptions(options),
    ));
  }

  const prevId = `tree:${params.messageId}:${Date.now()}:prev`;
  const nextId = `tree:${params.messageId}:${Date.now()}:next`;
  const closeId = `tree:${params.messageId}:${Date.now()}:close`;
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(prevId).setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(safePage === 0),
    new ButtonBuilder().setCustomId(`tree:${params.messageId}:${Date.now()}:page`).setLabel(`Page ${safePage + 1}/${pageCount}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(nextId).setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(safePage >= pageCount - 1),
    new ButtonBuilder().setCustomId(closeId).setLabel("Done").setStyle(ButtonStyle.Success),
  ));

  return { embed, rows, options, ids: { customId, prevId, nextId, closeId } };
}

export function buildSettingsCard(summary: string, baseId: string) {
  const embed = new EmbedBuilder()
    .setTitle("Settings")
    .setDescription("Use the buttons below to update Pi settings for this Discord harness.")
    .addFields({ name: "Current", value: summary.slice(0, 1024) });
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`${baseId}:thinking`).setLabel("Cycle thinking").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${baseId}:transport`).setLabel("Cycle transport").setStyle(ButtonStyle.Primary),
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`${baseId}:steering`).setLabel("Toggle steering").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${baseId}:followup`).setLabel("Toggle follow-up").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${baseId}:compact`).setLabel("Toggle auto compact").setStyle(ButtonStyle.Secondary),
  );
  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`${baseId}:done`).setLabel("Done").setStyle(ButtonStyle.Success),
  );
  return { embed, rows: [row1, row2, row3] };
}

export function buildApprovalCard(params: { title: string; description: string; approveLabel?: string; bullets?: string[]; caution?: string; approveId: string; rejectId: string }) {
  const embed = new EmbedBuilder()
    .setTitle(params.title)
    .setDescription(params.description);
  if (params.bullets && params.bullets.length > 0) {
    embed.addFields({ name: "Summary", value: params.bullets.map((bullet) => `• ${bullet}`).join("\n").slice(0, 1024) });
  }
  if (params.caution) {
    embed.addFields({ name: "Caution", value: params.caution.slice(0, 1024) });
  }
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(params.approveId).setLabel(params.approveLabel ?? "Approve").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(params.rejectId).setLabel("Cancel").setStyle(ButtonStyle.Secondary),
  );
  return { embed, rows: [row] };
}
