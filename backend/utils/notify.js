// utils/notify.js
// Sends "new donation nearby" alerts to NGOs via email and/or SMS.
//
// Both channels are optional and independently configured via env vars.
// If credentials for a channel aren't set, that channel is silently
// skipped (logged, not thrown) — notifications should never be able to
// break the core donation-creation flow.
//
// EMAIL: uses Nodemailer over SMTP. Works out of the box with a free
// Gmail account + an "App Password" (not your normal Gmail password —
// generate one at https://myaccount.google.com/apppasswords).
//
// SMS: uses Textbee (free — https://textbee.dev) or Twilio (paid),
// whichever is configured. Textbee needs a spare Android phone running
// the Textbee app as the SMS gateway; Twilio needs a paid account.
// Neither is required — if unconfigured, calls to sendSMS() are safely
// skipped.

const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// EMAIL
// ---------------------------------------------------------------------------

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for port 465, false for 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Send a plain-text/HTML email. Fails silently (logs, doesn't throw) if
 * SMTP isn't configured or the send fails — a notification problem should
 * never surface as an error to the donor posting a donation.
 */
async function sendEmail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[notify] Email skipped (SMTP not configured): would have sent "${subject}" to ${to}`);
    return { sent: false, reason: 'SMTP not configured' };
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || `"GiveAway" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error(`[notify] Email send failed to ${to}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

// ---------------------------------------------------------------------------
// SMS
// ---------------------------------------------------------------------------
//
// Two providers are supported, tried in this order based on which
// credentials are present in .env:
//   1. Textbee  — free (50 SMS/day, 300/month), no credit card. Uses a
//      spare Android phone as the SMS gateway via https://textbee.dev.
//   2. Twilio   — paid (no ongoing free tier), used as a fallback for
//      higher-volume/production needs if configured instead.
// If neither is configured, sendSMS() safely no-ops (logs, doesn't throw).

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) return null;

  // eslint-disable-next-line global-require
  const twilio = require('twilio');
  twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilioClient;
}

/**
 * Sends SMS via Textbee (https://textbee.dev) — free tier, no credit card,
 * routes the message through a connected Android phone's own SIM/carrier.
 */
async function sendViaTextbee({ to, message }) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;
  if (!apiKey || !deviceId) return null; // not configured — let caller try the next provider

  const res = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ recipients: [to], message }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Textbee responded ${res.status}: ${body}`);
  }
  return { sent: true, provider: 'textbee' };
}

/**
 * Sends SMS via Twilio — paid, used only if Textbee isn't configured.
 */
async function sendViaTwilio({ to, message }) {
  const client = getTwilioClient();
  if (!client) return null; // not configured

  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
  return { sent: true, provider: 'twilio' };
}

/**
 * Send an SMS via whichever provider is configured (Textbee preferred,
 * since it's free; Twilio as a fallback). Fails silently — logs and
 * returns { sent: false } rather than throwing — if neither is configured,
 * the phone number is invalid, or the provider's API call fails.
 */
async function sendSMS({ to, message }) {
  if (!to || !/^\+[1-9]\d{6,14}$/.test(to)) {
    console.log(`[notify] SMS skipped (phone "${to}" is not in E.164 format, e.g. +919876543210)`);
    return { sent: false, reason: 'Invalid phone format' };
  }

  try {
    const result = (await sendViaTextbee({ to, message })) || (await sendViaTwilio({ to, message }));
    if (!result) {
      console.log(`[notify] SMS skipped (no SMS provider configured): would have sent "${message}" to ${to}`);
      return { sent: false, reason: 'No SMS provider configured' };
    }
    return result;
  } catch (err) {
    console.error(`[notify] SMS send failed to ${to}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

// ---------------------------------------------------------------------------
// High-level helper: alert a list of NGOs about a new nearby donation
// ---------------------------------------------------------------------------

/**
 * Notifies a list of NGO recipients (each `{ email, phone, name }`) about a
 * newly posted donation. Sends both email and SMS per recipient where
 * possible; each channel/recipient failure is isolated so one bad email or
 * missing phone number never blocks the rest.
 *
 * @param {Array<{email:string, phone?:string, name:string, distanceKm?:number}>} recipients
 * @param {{foodName:string, quantity:{value:number, unit:string}, expiryDate:Date, pickupLocation:{address:string}, donationId:string, urgencyLabel?:string, expiryHrsText?:string}} donation
 */
async function notifyNGOsOfNewDonation(recipients, donation) {
  const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const donationUrl = `${appUrl}/donations/${donation.donationId}`;
  const expiry = new Date(donation.expiryDate).toLocaleString();
  const urgencyLine = donation.urgencyLabel ? `\n${donation.urgencyLabel}` : '';
  const expiryText = donation.expiryHrsText
    ? `Expires in ${donation.expiryHrsText}`
    : `Expires: ${expiry}`;

  const results = await Promise.allSettled(
    recipients.map(async (r) => {
      const distanceText = typeof r.distanceKm === 'number' ? ` (~${r.distanceKm} km from your office)` : '';

      // ── Email ──────────────────────────────────────────────────────────
      const subject = `${donation.urgencyLabel ? '🚨 ' : '🍱 '}New donation nearby: ${donation.foodName}`;
      const text =
        `Hi ${r.name},\n\n` +
        `A new food donation is available near your office${distanceText}:${urgencyLine}\n\n` +
        `Food:     ${donation.foodName}\n` +
        `Quantity: ${donation.quantity.value} ${donation.quantity.unit}\n` +
        `Location: ${donation.pickupLocation.address}\n` +
        `${expiryText}\n\n` +
        `⚡ First NGO to accept gets it! View and accept here:\n${donationUrl}\n\n` +
        `— GiveAway`;

      const html = `
        <div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#16a34a;">🍱 GiveAway — New Donation Near You${distanceText}</h2>
          ${donation.urgencyLabel ? `<p style="color:#dc2626;font-weight:700;font-size:15px;">${donation.urgencyLabel}</p>` : ''}
          <p>Hi <strong>${r.name}</strong>,</p>
          <p>A donor just posted food available for pickup near your registered office:</p>
          <table style="width:100%;border-collapse:collapse;margin:12px 0;">
            <tr><td style="padding:6px 4px;color:#666;">Food</td><td><strong>${donation.foodName}</strong></td></tr>
            <tr><td style="padding:6px 4px;color:#666;">Quantity</td><td>${donation.quantity.value} ${donation.quantity.unit}</td></tr>
            <tr><td style="padding:6px 4px;color:#666;">Pickup at</td><td>${donation.pickupLocation.address}</td></tr>
            <tr><td style="padding:6px 4px;color:#666;">Expiry</td><td style="color:#dc2626;font-weight:600;">${expiryText}</td></tr>
          </table>
          <p style="font-size:13px;color:#555;">⚡ <strong>First NGO to accept gets it.</strong> Tap below to accept now:</p>
          <a href="${donationUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Accept This Donation</a>
          <p style="color:#999;font-size:11px;margin-top:20px;">You received this because your NGO is registered on GiveAway near this donation's pickup point.</p>
        </div>`;

      // ── SMS ────────────────────────────────────────────────────────────
      // Concise but complete — fits within typical 160-char SMS budget
      const smsMessage =
        `🍱 GiveAway: ${donation.foodName} (${donation.quantity.value} ${donation.quantity.unit}) at ` +
        `${donation.pickupLocation.address}${distanceText}. ` +
        `${expiryText}. ` +
        (donation.urgencyLabel ? `${donation.urgencyLabel} ` : '') +
        `1st to accept wins! ${donationUrl}`;

      const [emailResult, smsResult] = await Promise.all([
        r.email ? sendEmail({ to: r.email, subject, text, html }) : Promise.resolve({ sent: false, reason: 'No email on file' }),
        r.phone ? sendSMS({ to: r.phone, message: smsMessage }) : Promise.resolve({ sent: false, reason: 'No phone on file' }),
      ]);

      return { recipient: r.name, email: emailResult, sms: smsResult };
    })
  );

  return results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message }));
}

async function notifyVolunteersOfNewPickup(recipients, donation) {
  const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const donationUrl = `${appUrl}/dashboard/pickups?donationId=${donation.donationId}`;
  const expiry = new Date(donation.expiryDate).toLocaleString();

  const results = await Promise.allSettled(
    recipients.map(async (r) => {
      // Email
      const subject = `🚲 New Pickup Available: ${donation.foodName}`;
      const text =
        `Hi ${r.name},\n\n` +
        `A new food pickup is available near you:\n\n` +
        `Food:     ${donation.foodName}\n` +
        `Quantity: ${donation.quantity.value} ${donation.quantity.unit}\n` +
        `Location: ${donation.pickupLocation.address}\n` +
        `Expires:  ${expiry}\n\n` +
        `⚡ First volunteer to accept gets it! Accept here:\n${donationUrl}\n\n` +
        `— GiveAway`;

      const html = `
        <div style="font-family:sans-serif;max-width:520px">
          <h2 style="color:#16a34a;">🚲 GiveAway — New Pickup Near You</h2>
          <p>Hi <strong>${r.name}</strong>,</p>
          <p>A new food pickup is available near your location:</p>
          <table style="width:100%;border-collapse:collapse;margin:12px 0;">
            <tr><td style="padding:6px 4px;color:#666;">Food</td><td><strong>${donation.foodName}</strong></td></tr>
            <tr><td style="padding:6px 4px;color:#666;">Quantity</td><td>${donation.quantity.value} ${donation.quantity.unit}</td></tr>
            <tr><td style="padding:6px 4px;color:#666;">Pickup at</td><td>${donation.pickupLocation.address}</td></tr>
            <tr><td style="padding:6px 4px;color:#666;">Expiry</td><td style="color:#dc2626;font-weight:600;">${expiry}</td></tr>
          </table>
          <p style="font-size:13px;color:#555;">⚡ <strong>First volunteer to accept gets it.</strong> Tap below to accept now:</p>
          <a href="${donationUrl}" style="display:inline-block;background:#16a34a;color:white;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Accept Pickup</a>
        </div>`;

      // SMS
      const smsMessage =
        `🚲 GiveAway: ${donation.foodName} (${donation.quantity.value} ${donation.quantity.unit}) ready for pickup at ` +
        `${donation.pickupLocation.address}. Expiry: ${expiry}. ` +
        `Accept: ${donationUrl}`;

      const [emailResult, smsResult] = await Promise.all([
        r.email ? sendEmail({ to: r.email, subject, text, html }) : Promise.resolve({ sent: false, reason: 'No email on file' }),
        r.phone ? sendSMS({ to: r.phone, message: smsMessage }) : Promise.resolve({ sent: false, reason: 'No phone on file' }),
      ]);

      return { recipient: r.name, email: emailResult, sms: smsResult };
    })
  );

  return results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message }));
}

module.exports = { sendEmail, sendSMS, notifyNGOsOfNewDonation, notifyVolunteersOfNewPickup };

