/** Posts payment events to the Discord pay log channel through the bot token. */

export const PAY_LOG_COLORS = {
  info: 0x5865f2,
  success: 0x2ecc71,
  fail: 0xed4245,
  warning: 0xfee75c,
  urgent: 0xff0055,
};

/** Buyer-supplied values (email, coupon) must not render as masked links or formatting for staff. */
const escapeMarkdown = (text) => text.replace(/([\\[\]()<>*_~|])/g, "\\$1");

/**
 * `payment` marks money that actually reached us: it pings @everyone with the amount as a big
 * heading and a full embed. Everything else is posted as a compact message in small text.
 */
export async function postPayLog({ title, color = PAY_LOG_COLORS.warning, fields = [], alert = false, payment, source = "Binance Gift Card" }) {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const channelId = process.env.PAY_LOG_CHANNEL_ID?.trim();
  if (!token || !channelId) return false;

  const roleId = process.env.PAY_LOG_ALERT_ROLE_ID?.trim() || "";
  const rolePing = alert && roleId ? `<@&${roleId}>` : "";
  const footer = { text: `lolscript.store · ${source}` };
  const timestamp = new Date().toISOString();
  const shown = fields.filter(([, value]) => value != null && value !== "");

  const body = payment
    ? {
        content: [`@everyone ${rolePing}`.trim(), `# 💰 ${payment.amount}`, `**${title}** · ${source}`].join("\n"),
        allowed_mentions: { parse: ["everyone"], roles: rolePing ? [roleId] : [] },
        embeds: [
          {
            title,
            color,
            fields: shown.map(([name, value]) => ({
              name,
              value: escapeMarkdown(String(value)).slice(0, 1024),
              inline: String(value).length < 40,
            })),
            footer,
            timestamp,
          },
        ],
      }
    : {
        content: rolePing || undefined,
        allowed_mentions: rolePing ? { roles: [roleId] } : { parse: [] },
        embeds: [
          {
            author: { name: title.slice(0, 256) },
            color,
            description: shown
              .map(([name, value]) => `-# **${name}:** ${escapeMarkdown(String(value).replace(/\s*\n\s*/g, ", "))}`)
              .join("\n")
              .slice(0, 4096) || undefined,
            footer,
            timestamp,
          },
        ],
      };

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const hint = res.status === 401 ? "DISCORD_BOT_TOKEN is invalid" : res.status === 403 ? "bot cannot post in PAY_LOG_CHANNEL_ID" : "";
      console.error(`[pay-log] Discord responded ${res.status}${hint ? ` (${hint})` : ""}`);
    }
    return res.ok;
  } catch (error) {
    console.error(`[pay-log] ${error.message}`);
    return false;
  }
}
