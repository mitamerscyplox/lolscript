/** Posts payment events to the Discord pay log channel through the bot token. */

export const PAY_LOG_COLORS = {
  info: 0x5865f2,
  success: 0x2ecc71,
  fail: 0xed4245,
  warning: 0xfee75c,
  urgent: 0xff0055,
};

export async function postPayLog({ title, color = PAY_LOG_COLORS.warning, fields = [], alert = false }) {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const channelId = process.env.PAY_LOG_CHANNEL_ID?.trim();
  if (!token || !channelId) return false;

  const roleId = process.env.PAY_LOG_ALERT_ROLE_ID?.trim();
  const body = {
    content: alert && roleId ? `<@&${roleId}>` : undefined,
    allowed_mentions: roleId ? { roles: [roleId] } : { parse: [] },
    embeds: [
      {
        title,
        color,
        fields: fields
          .filter(([, value]) => value != null && value !== "")
          .map(([name, value]) => ({ name, value: String(value).slice(0, 1024), inline: String(value).length < 40 })),
        footer: { text: "lolscript.store · Binance Gift Card" },
        timestamp: new Date().toISOString(),
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
