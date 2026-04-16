import { getResend, FROM_EMAIL } from "./client";

type SendResult = { sent: boolean; error?: string };

async function send(
  to: string,
  subject: string,
  html: string
): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    // Email not configured — log and skip (dev/local environments)
    console.log(`[email:skipped] to=${to} subject="${subject}"`);
    return { sent: false, error: "Email not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("[email:error]", error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (e: any) {
    console.error("[email:exception]", e);
    return { sent: false, error: e.message };
  }
}

function baseStyle() {
  return `
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    max-width: 560px;
    margin: 0 auto;
    padding: 24px;
    color: #111;
    line-height: 1.5;
  `;
}

function brandHeader() {
  return `
    <div style="font-weight: 700; font-size: 20px; margin-bottom: 24px;">
      Flash<span style="color: #6366f1;">Local</span>
    </div>
  `;
}

function button(href: string, label: string) {
  return `
    <a href="${href}"
       style="display: inline-block; background: #111; color: #fff;
              padding: 12px 20px; border-radius: 8px; text-decoration: none;
              font-weight: 600; margin: 16px 0;">
      ${label}
    </a>
  `;
}

// ---------- Public API ----------

export async function sendBookingConfirmation(params: {
  to: string;
  customerName: string;
  providerName: string;
  packageName: string;
  scheduledDate: string | null;
  address: string;
  depositAmountCents: number;
  totalAmountCents: number;
}) {
  const deposit = (params.depositAmountCents / 100).toFixed(2);
  const total = (params.totalAmountCents / 100).toFixed(2);
  const date = params.scheduledDate
    ? new Date(params.scheduledDate).toLocaleDateString()
    : "Flexible";

  const html = `
    <div style="${baseStyle()}">
      ${brandHeader()}
      <h1 style="font-size: 22px; margin-top: 0;">Your booking is confirmed ✅</h1>
      <p>Hi ${params.customerName},</p>
      <p>Thanks for booking with <strong>${params.providerName}</strong>.
         Here are your booking details:</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>Service:</strong> ${params.packageName}</p>
        <p style="margin: 0 0 8px;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 0 0 8px;"><strong>Address:</strong> ${params.address}</p>
        <p style="margin: 0 0 8px;"><strong>Deposit paid:</strong> $${deposit}</p>
        <p style="margin: 0;"><strong>Total:</strong> $${total}</p>
      </div>
      <p>${params.providerName} will reach out soon to confirm timing and details.</p>
      <p style="margin-top: 32px; color: #666; font-size: 12px;">
        Powered by Flash Local
      </p>
    </div>
  `;

  return send(
    params.to,
    `Booking confirmed — ${params.providerName}`,
    html
  );
}

export async function sendNewBookingAlert(params: {
  to: string;
  providerName: string;
  customerName: string;
  packageName: string;
  scheduledDate: string | null;
  totalAmountCents: number;
  dashboardUrl: string;
}) {
  const total = (params.totalAmountCents / 100).toFixed(2);
  const date = params.scheduledDate
    ? new Date(params.scheduledDate).toLocaleDateString()
    : "Flexible";

  const html = `
    <div style="${baseStyle()}">
      ${brandHeader()}
      <h1 style="font-size: 22px; margin-top: 0;">New booking! 🎉</h1>
      <p>Hi ${params.providerName},</p>
      <p>You just got a new booking:</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>Customer:</strong> ${params.customerName}</p>
        <p style="margin: 0 0 8px;"><strong>Package:</strong> ${params.packageName}</p>
        <p style="margin: 0 0 8px;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 0;"><strong>Total:</strong> $${total}</p>
      </div>
      ${button(params.dashboardUrl, "View Booking")}
      <p style="margin-top: 32px; color: #666; font-size: 12px;">
        Confirm the booking and reach out to your customer in the dashboard.
      </p>
    </div>
  `;

  return send(params.to, `New booking from ${params.customerName}`, html);
}

export async function sendReviewRequest(params: {
  to: string;
  customerName: string;
  providerName: string;
  reviewUrl: string;
}) {
  const html = `
    <div style="${baseStyle()}">
      ${brandHeader()}
      <h1 style="font-size: 22px; margin-top: 0;">How was your experience? ⭐</h1>
      <p>Hi ${params.customerName},</p>
      <p>Thanks for choosing <strong>${params.providerName}</strong>!
         We'd love to hear how everything went.</p>
      <p>Your review helps other neighbors find great local service.</p>
      ${button(params.reviewUrl, "Leave a Review")}
      <p style="color: #666; font-size: 13px;">
        It takes less than a minute.
      </p>
    </div>
  `;

  return send(
    params.to,
    `How was ${params.providerName}?`,
    html
  );
}

export async function sendWelcome(params: {
  to: string;
  displayName?: string;
  dashboardUrl: string;
}) {
  const name = params.displayName ?? "there";
  const html = `
    <div style="${baseStyle()}">
      ${brandHeader()}
      <h1 style="font-size: 22px; margin-top: 0;">Welcome to Flash Local 👋</h1>
      <p>Hi ${name},</p>
      <p>Thanks for joining Flash Local. You're minutes away from a live
         microsite where customers can book and pay you directly.</p>
      ${button(params.dashboardUrl, "Go to Dashboard")}
      <p style="margin-top: 32px; color: #666; font-size: 12px;">
        Need help? Just reply to this email.
      </p>
    </div>
  `;

  return send(params.to, "Welcome to Flash Local", html);
}
