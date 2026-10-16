/**
 * Emails the dealership when a customer submits an inquiry.
 *
 * A lead sitting unseen until someone happens to open the admin panel
 * is a lost sale, so this fires the moment a row lands in `inquiries`.
 *
 * Deployment (one time):
 *   1. Create a free account at resend.com, verify your sending domain
 *      (or use their onboarding@resend.dev for testing), get an API key.
 *   2. supabase secrets set RESEND_API_KEY=re_xxx \
 *        NOTIFY_TO=sales@yourdealer.com \
 *        NOTIFY_FROM="Dealer DMS <noreply@yourdomain.com>" \
 *        SITE_URL=https://your-site.vercel.app \
 *        WEBHOOK_SECRET=$(openssl rand -hex 32)
 *   3. supabase functions deploy notify-inquiry --no-verify-jwt
 *   4. Run supabase/migration-add-inquiry-webhook.sql to fire it on insert,
 *      with the same WEBHOOK_SECRET filled in.
 *
 * The function is deployed without JWT verification (the database
 * trigger has no user session), which makes its URL public. The shared
 * secret is what stops anyone else from using it to send email to the
 * dealership's inbox.
 *
 * Failures are logged, never thrown back at the customer — the inquiry
 * is already saved by the time this runs, and a mail outage must not
 * look like a broken contact form.
 */

interface InquiryPayload {
  type: string;
  record: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    message: string | null;
    vehicle_id: string | null;
    created_at: string;
  };
}

Deno.serve(async (request: Request) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret) {
    console.error("notify-inquiry: WEBHOOK_SECRET not set — refusing all requests");
    return new Response("not configured", { status: 500 });
  }
  if (!timingSafeEqual(request.headers.get("x-webhook-secret") ?? "", secret)) {
    return new Response("unauthorized", { status: 401 });
  }

  try {
    const payload = (await request.json()) as InquiryPayload;
    const inquiry = payload.record;
    if (!inquiry) return new Response("no record", { status: 400 });

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const to = Deno.env.get("NOTIFY_TO");
    const from = Deno.env.get("NOTIFY_FROM") ?? "Dealer DMS <onboarding@resend.dev>";
    const siteUrl = Deno.env.get("SITE_URL") ?? "";

    if (!apiKey || !to) {
      console.error("notify-inquiry: RESEND_API_KEY or NOTIFY_TO not set — skipping");
      return new Response("not configured", { status: 200 });
    }

    // Look up the vehicle so the email says which car, not just an id.
    let vehicleLine = "פנייה כללית (ללא רכב מסוים)";
    if (inquiry.vehicle_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceKey) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/vehicles?id=eq.${encodeURIComponent(inquiry.vehicle_id)}&select=brand,model,year,stock_number,slug`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
        );
        if (res.ok) {
          const [v] = await res.json();
          if (v) {
            vehicleLine = `${v.brand} ${v.model} ${v.year} (מלאי ${v.stock_number})`;
            if (siteUrl) vehicleLine += `\n${siteUrl}/vehicles/${v.slug}`;
          }
        }
      }
    }

    const subject = `פנייה חדשה מ${inquiry.full_name}`;
    const html = `
      <div dir="rtl" style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.6">
        <h2 style="margin:0 0 12px">פנייה חדשה מהאתר</h2>
        <table style="border-collapse:collapse">
          <tr><td style="padding:4px 12px 4px 0;color:#4b5563">שם</td><td><strong>${escapeHtml(inquiry.full_name)}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#4b5563">טלפון</td><td dir="ltr"><a href="tel:${escapeHtml(inquiry.phone)}">${escapeHtml(inquiry.phone)}</a></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#4b5563">דוא״ל</td><td dir="ltr"><a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#4b5563">רכב</td><td style="white-space:pre-line">${escapeHtml(vehicleLine)}</td></tr>
        </table>
        ${inquiry.message ? `<p style="margin:16px 0 0"><strong>הודעה:</strong><br>${escapeHtml(inquiry.message)}</p>` : ""}
        ${siteUrl ? `<p style="margin:20px 0 0"><a href="${escapeHtml(siteUrl)}/admin/inquiries">פתיחת הפניות בפאנל הניהול</a></p>` : ""}
      </div>`;

    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: to.split(",").map((s) => s.trim()),
        subject,
        html,
        reply_to: inquiry.email,
      }),
    });

    if (!send.ok) {
      console.error("notify-inquiry: send failed", await send.text());
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("notify-inquiry: unexpected error", err);
    return new Response("error logged", { status: 200 });
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Compares without short-circuiting, so response timing doesn't leak
 *  how much of a guessed secret was right. */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}
