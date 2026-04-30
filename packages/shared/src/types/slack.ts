export type SlackSeverity = "info" | "warning" | "error" | "critical";

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: Array<{ type: string; text: string }>;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  username?: string;
  icon_emoji?: string;
}

export interface SlackAlertResult {
  channel: string;
  messageTs?: string;
  ok: boolean;
}
