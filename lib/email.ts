import nodemailer from "nodemailer";

interface SendWelcomeEmailParams {
  email: string;
  name: string;
  role: string;
  tempPassword: string;
}

interface SendResetEmailParams {
  email: string;
  name: string;
  tempPassword: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return null; // Fallback to console logging
}

export async function sendWelcomeEmail({
  email,
  name,
  role,
  tempPassword,
}: SendWelcomeEmailParams): Promise<{ success: boolean; simulated?: boolean }> {
  const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const fromEmail = process.env.SMTP_FROM || "Terry & Dana <noreply@traveltracker.com>";
  const isAdmin = role === "admin";

  const adminGuideHtml = isAdmin
    ? `
    <div style="margin-top: 24px; padding: 20px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;">
      <h3 style="margin-top: 0; color: #166534; font-size: 18px;">👑 Admin Quick Start Guide</h3>
      <p style="color: #15803d; font-size: 14px; margin-bottom: 12px;">
        As an Administrator, you have full privileges to manage content and users across the site:
      </p>

      <ul style="color: #166534; font-size: 14px; padding-left: 20px; line-height: 1.6;">
        <li><strong>📷 Adding Destination Photos:</strong> Click <em>"Add Photo"</em> on any location card, timeline item, or at <a href="${siteUrl}/pictures" style="color: #047857;">${siteUrl}/pictures</a>. You can upload image files directly or paste Google Photos links!</li>
        <li><strong>🗑️ Deleting Photos:</strong> Click on any photo to open the Lightbox view, then click the red trash icon in the top header.</li>
        <li><strong>👥 Managing Users:</strong> Visit <a href="${siteUrl}/admin/users" style="color: #047857;">${siteUrl}/admin/users</a> to create new accounts, resend welcome emails, or force password resets.</li>
        <li><strong>🗺️ Managing Trips & Travel Data:</strong> Edit trip destinations, arrival/departure dates, and home base statuses directly in your Google Spreadsheet.</li>
      </ul>
    </div>
    `
    : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Where in the World are Terry and Dana?</title>
    </head>
    <body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 20px; margin: 0;">
      <div style="max-w: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1e293b; font-size: 24px; font-weight: 800; margin: 0;">✈️ Welcome to Our Travel Tracker!</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 6px;">Where in the World are Terry and Dana?</p>
        </div>

        <p style="color: #334155; font-size: 16px;">Hi <strong>${name}</strong>,</p>
        
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          An account has been created for you on our travel website as <strong>${role.toUpperCase()}</strong>.
        </p>

        <!-- Temporary Credentials Card -->
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af; font-size: 16px;">🔑 Your Temporary Login Credentials</h3>
          <p style="margin: 6px 0; color: #1e3a8a; font-size: 14px;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 6px 0; color: #1e3a8a; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background-color: #dbeafe; padding: 3px 8px; border-radius: 6px; font-weight: bold; color: #1d4ed8;">${tempPassword}</code></p>
          <p style="margin-top: 12px; margin-bottom: 0; color: #dc2626; font-size: 13px; font-weight: 600;">
            ⚠️ Note: For your security, you will be required to change this temporary password immediately upon your first sign-in.
          </p>
        </div>

        <!-- Call to Action Button -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${siteUrl}/auth/signin" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 700; font-size: 15px; display: inline-block;">
            Sign In to Travel Tracker →
          </a>
        </div>

        ${adminGuideHtml}

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          Sent with ❤️ by Terry & Dana&apos;s Travel Tracker.
        </p>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: "Welcome to Terry & Dana's Travel Tracker!",
        html: htmlContent,
      });
      return { success: true };
    } catch (err) {
      console.error("Error sending welcome email via SMTP:", err);
      // Fallback to console log on error
    }
  }

  // Simulated email log for development / missing SMTP credentials
  console.log("\n=======================================================");
  console.log(`[SIMULATED WELCOME EMAIL SENT TO ${email}]`);
  console.log(`Role: ${role}`);
  console.log(`Temporary Password: ${tempPassword}`);
  console.log("=======================================================\n");

  return { success: true, simulated: true };
}

export async function sendPasswordResetEmail({
  email,
  name,
  tempPassword,
}: SendResetEmailParams): Promise<{ success: boolean; simulated?: boolean }> {
  const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const fromEmail = process.env.SMTP_FROM || "Terry & Dana <noreply@traveltracker.com>";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset - Where in the World are Terry and Dana?</title>
    </head>
    <body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 20px; margin: 0;">
      <div style="max-w: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
        
        <h2 style="color: #1e293b; font-size: 22px; margin-top: 0;">🔐 Password Reset Request</h2>
        <p style="color: #334155; font-size: 15px;">Hi <strong>${name}</strong>,</p>
        <p style="color: #334155; font-size: 15px;">An administrator has re-issued a temporary password for your account.</p>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 6px 0; color: #1e3a8a; font-size: 14px;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 6px 0; color: #1e3a8a; font-size: 14px;"><strong>New Temporary Password:</strong> <code style="background-color: #dbeafe; padding: 3px 8px; border-radius: 6px; font-weight: bold; color: #1d4ed8;">${tempPassword}</code></p>
          <p style="margin-top: 12px; margin-bottom: 0; color: #dc2626; font-size: 13px; font-weight: 600;">
            ⚠️ You will be prompted to set a new permanent password immediately upon sign-in.
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${siteUrl}/auth/signin" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 700; font-size: 15px; display: inline-block;">
            Sign In & Reset Password →
          </a>
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: "Password Reset - Terry & Dana's Travel Tracker",
        html: htmlContent,
      });
      return { success: true };
    } catch (err) {
      console.error("Error sending reset email via SMTP:", err);
    }
  }

  console.log("\n=======================================================");
  console.log(`[SIMULATED RESET EMAIL SENT TO ${email}]`);
  console.log(`New Temporary Password: ${tempPassword}`);
  console.log("=======================================================\n");

  return { success: true, simulated: true };
}
