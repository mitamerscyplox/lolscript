/**
 * Transactional email through Resend's REST API (RESEND_API_KEY + MAIL_FROM).
 * Without a key, development prints the message to the server console instead of sending it.
 */

const PROD = process.env.NODE_ENV === "production";

export function siteUrl() {
  return (process.env.SITE_URL || "https://www.lolscript.store").replace(/\/+$/, "");
}

export function mailerReady() {
  return Boolean(process.env.RESEND_API_KEY?.trim()) || !PROD;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function render(mail) {
  const site = siteUrl();
  const code = mail.code
    ? `<div style="margin:24px 0;padding:18px 0;border:1px solid #2c2140;border-radius:10px;background:#0b0712;text-align:center;font:700 32px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:10px;color:#a78bfa">${esc(mail.code)}</div>`
    : "";
  const button = mail.button
    ? `<p style="margin:24px 0"><a href="${esc(mail.button.url)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#8b5cf6;color:#ffffff;font-weight:700;text-decoration:none">${esc(mail.button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#0b0712;padding:32px 16px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#cfc6e3">
<div style="max-width:480px;margin:0 auto;border:1px solid #2c2140;border-radius:14px;background:#15101f;padding:32px">
<p style="margin:0 0 24px;font-weight:800;letter-spacing:3px;color:#fff">LOLSCRIPT</p>
<h1 style="margin:0 0 12px;font-size:20px;color:#f6f4ff">${esc(mail.heading)}</h1>
${mail.lines.map((l) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.6">${esc(l)}</p>`).join("")}
${code}${button}
<p style="margin:24px 0 0;font-size:12px;color:#8a7fa3"><a href="${esc(site)}" style="color:#8a7fa3">${esc(site.replace(/^https?:\/\//, ""))}</a></p>
</div></body></html>`;
}

export async function sendMail(mail) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    if (PROD) return false;
    const line = `[mailer:dev] to=${mail.to} subject="${mail.subject}"${mail.code ? ` code=${mail.code}` : ""}${mail.button ? ` link=${mail.button.url}` : ""}`;
    console.info(line);
    const [{ appendFile }, { tmpdir }, { join }] = await Promise.all([import("node:fs/promises"), import("node:os"), import("node:path")]);
    await appendFile(join(tmpdir(), "lolscript-dev-mail.log"), `${new Date().toISOString()} ${line}\n`).catch(() => {});
    return true;
  }
  const from = process.env.MAIL_FROM?.trim() || "LOLScript <no-reply@lolscript.store>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        html: render(mail),
        text: [mail.heading, ...mail.lines, mail.code, mail.button?.url].filter(Boolean).join("\n\n"),
      }),
    });
    if (!res.ok) console.error("[mailer] send failed", res.status, (await res.text().catch(() => "")).slice(0, 300));
    return res.ok;
  } catch (err) {
    console.error("[mailer] send failed", err);
    return false;
  }
}
