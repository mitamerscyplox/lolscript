import { issueResetToken, issueVerifyCode } from "./auth.mjs";
import { getCachedDiscordInviteUrl } from "./discord-core.mjs";
import { mailerReady, sendMail, siteUrl } from "./mailer.mjs";

export async function sendVerifyCodeMail(user) {
  const code = await issueVerifyCode(user.id);
  return sendMail({
    to: user.email,
    subject: `${code} is your LOLScript verification code`,
    heading: "Verify your email",
    lines: [
      `Hi ${user.name},`,
      "Enter this code on your account page to confirm your email and unlock your orders and license keys. It expires in 15 minutes.",
    ],
    code,
  });
}

/** Links to the configured site URL; `devOrigin` is only passed outside production so local testing works. */
export async function sendResetMail(user, devOrigin) {
  const base = (devOrigin || siteUrl()).replace(/\/+$/, "");
  const token = await issueResetToken(user);
  return sendMail({
    to: user.email,
    subject: "Reset your LOLScript password",
    heading: "Password reset request",
    lines: [
      `Hi ${user.name},`,
      "Click the button below to choose a new password. The link expires in 30 minutes. If you didn’t ask for this, you can ignore this email.",
    ],
    button: { label: "Reset password", url: `${base}/reset-password#token=${token}` },
  });
}

/** Tells a paying customer their order fell back to manual delivery, so they don't assume it was lost. */
export async function sendManualDeliveryMail(to, order) {
  if (!mailerReady()) return false;
  const invite = await getCachedDiscordInviteUrl().catch(() => "");
  return sendMail({
    to,
    subject: `Order received — delivery in progress (#${order.id})`,
    heading: "Your payment was received",
    lines: [
      `Thank you! We received your payment for Shopier order #${order.id}.`,
      ...(order.items.length ? [`Products: ${order.items.join(", ")}`] : []),
      "Your order is being prepared by our team and your key will be emailed to this address shortly, usually within 30 minutes.",
      "No need to pay again. If you have any questions, reach us on Discord and mention your order number.",
    ],
    button: invite ? { label: "Contact support on Discord", url: invite } : undefined,
  });
}
