/* ==========================================================================
   Behind The Booth Entertainment LLC — Cloud Function: submitBooking
   
   Receives booking form submissions via HTTPS, validates input, writes to
   Firestore, and sends a notification email to the business owner.
   
   Secrets (set via `firebase functions:secrets:set`):
     GMAIL_USER          — Gmail address used as SMTP sender
     GMAIL_APP_PASSWORD   — 16-char app password (not the login password)
     BOOKING_NOTIFY_TO    — Destination email (djjondoe@behindtheboothent.com)
   ========================================================================== */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

// ---------- Firebase Init ----------
initializeApp();
const db = getFirestore();

// ---------- Secrets ----------
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const BOOKING_NOTIFY_TO = defineSecret("BOOKING_NOTIFY_TO");

// ---------- Validation helpers ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateBooking(data) {
  const errors = [];

  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    errors.push("name is required");
  } else if (data.name.length > 100) {
    errors.push("name must be 100 characters or fewer");
  }

  if (!data.email || typeof data.email !== "string" || !EMAIL_RE.test(data.email)) {
    errors.push("a valid email is required");
  }

  if (!data.phone || typeof data.phone !== "string" || data.phone.trim().length === 0) {
    errors.push("phone is required");
  }

  if (!data.date || typeof data.date !== "string") {
    errors.push("event date is required");
  }

  if (!data.eventType || typeof data.eventType !== "string") {
    errors.push("event type is required");
  }

  if (!data.venue || typeof data.venue !== "string" || data.venue.trim().length === 0) {
    errors.push("venue is required");
  }

  if (!data.consultationDate || typeof data.consultationDate !== "string") {
    errors.push("consultation date is required");
  }

  if (!data.consultationTime || typeof data.consultationTime !== "string") {
    errors.push("consultation time is required");
  }

  if (data.notes && typeof data.notes === "string" && data.notes.length > 2000) {
    errors.push("notes must be 2000 characters or fewer");
  }

  return errors;
}

// ---------- Rate Limiting ----------
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

async function isRateLimited(ip) {
  const docRef = db.collection("rateLimits").doc(ip.replace(/[/.]/g, "_"));
  const doc = await docRef.get();

  const now = Date.now();

  if (!doc.exists) {
    await docRef.set({ count: 1, windowStart: now });
    return false;
  }

  const { count, windowStart } = doc.data();

  // Window expired — reset
  if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
    await docRef.set({ count: 1, windowStart: now });
    return false;
  }

  if (count >= RATE_LIMIT_MAX) {
    return true;
  }

  await docRef.update({ count: FieldValue.increment(1) });
  return false;
}

// ---------- Email ----------
function buildEmailHtml(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #D4AF37; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">
        🎧 New Booking Inquiry
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; color: #555; width: 160px;">Name</td>
          <td style="padding: 8px 12px;">${escapeHtml(data.name)}</td>
        </tr>
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: bold; color: #555;">Email</td>
          <td style="padding: 8px 12px;"><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; color: #555;">Phone</td>
          <td style="padding: 8px 12px;"><a href="tel:${escapeHtml(data.phone)}">${escapeHtml(data.phone)}</a></td>
        </tr>
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: bold; color: #555;">Event Date</td>
          <td style="padding: 8px 12px;">${escapeHtml(data.date)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; color: #555;">Event Type</td>
          <td style="padding: 8px 12px;">${escapeHtml(data.eventType)}</td>
        </tr>
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: bold; color: #555;">Venue & City</td>
          <td style="padding: 8px 12px;">${escapeHtml(data.venue)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; color: #555;">Expected Hours</td>
          <td style="padding: 8px 12px;">${data.hours ? escapeHtml(String(data.hours)) : "Not specified"}</td>
        </tr>
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: bold; color: #555;">Consultation Date</td>
          <td style="padding: 8px 12px;">${escapeHtml(data.consultationDate)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; color: #555;">Consultation Time</td>
          <td style="padding: 8px 12px;">${escapeHtml(data.consultationTime)}</td>
        </tr>
        ${data.notes ? `
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Notes</td>
          <td style="padding: 8px 12px; white-space: pre-wrap;">${escapeHtml(data.notes)}</td>
        </tr>` : ""}
      </table>
      <p style="color: #888; font-size: 12px; margin-top: 20px;">
        Reply directly to this email to respond to <strong>${escapeHtml(data.name)}</strong> at
        <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a>.
      </p>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------- Main Handler ----------
exports.submitBooking = onRequest(
  {
    region: "us-east1",
    cors: true,
    secrets: [GMAIL_USER, GMAIL_APP_PASSWORD, BOOKING_NOTIFY_TO],
  },
  async (req, res) => {
    // Only accept POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // Reject wrong content type
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("application/json")) {
      res.status(415).json({ error: "Content-Type must be application/json" });
      return;
    }

    const data = req.body;

    // --- Honeypot check ---
    if (data._gotcha && String(data._gotcha).trim().length > 0) {
      // Bot detected — pretend success, but do nothing
      res.status(200).json({ success: true });
      return;
    }

    // --- Rate limiting ---
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";

    try {
      if (await isRateLimited(clientIp)) {
        res.status(429).json({
          error: "Too many submissions. Please try again in an hour.",
        });
        return;
      }
    } catch (err) {
      console.error("Rate limit check failed:", err);
      // Don't block the request if rate limiting errors out
    }

    // --- Validation ---
    const errors = validateBooking(data);
    if (errors.length > 0) {
      res.status(400).json({ error: "Validation failed", details: errors });
      return;
    }

    // --- Write to Firestore ---
    const bookingData = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      date: data.date,
      eventType: data.eventType,
      venue: data.venue.trim(),
      hours: data.hours ? Number(data.hours) : null,
      consultationDate: data.consultationDate,
      consultationTime: data.consultationTime,
      notes: data.notes ? data.notes.trim() : null,
      submittedAt: FieldValue.serverTimestamp(),
      ip: clientIp,
    };

    let docId;
    try {
      const docRef = await db.collection("bookings").add(bookingData);
      docId = docRef.id;
    } catch (err) {
      console.error("Firestore write failed:", err);
      res.status(500).json({ error: "Failed to save booking. Please try again." });
      return;
    }

    // --- Send notification email ---
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: GMAIL_USER.value(),
          pass: GMAIL_APP_PASSWORD.value(),
        },
      });

      await transporter.sendMail({
        from: `"Behind The Booth Bookings" <${GMAIL_USER.value()}>`,
        replyTo: data.email.trim(),
        to: BOOKING_NOTIFY_TO.value(),
        subject: `🎧 New Booking: ${data.eventType} — ${data.name.trim()}`,
        html: buildEmailHtml(data),
      });
    } catch (err) {
      // Email failure is non-fatal — the booking is already saved in Firestore.
      // Jonathan can retrieve it from the console if the email doesn't arrive.
      console.error("Email send failed (booking saved as " + docId + "):", err);
    }

    res.status(200).json({
      success: true,
      message: "Booking inquiry received! Jonathan will contact you within 24 hours.",
    });
  }
);
