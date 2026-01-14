// Services/EmailService.js
const nodemailer = require("nodemailer");
const User = require("../Models/UserCredential");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  /**
   * Send offline message notification to user
   * @param {Object} params - Notification parameters
   * @param {string} params.recipientId - ID of the message recipient
   * @param {string} params.senderName - Name of the message sender
   * @param {string} params.senderRole - Role of sender (user/officiant)
   * @param {string} params.messageContent - Content of the message
   * @param {string} params.roomId - Chat room ID for navigation
   */
  async sendOfflineMessageNotification({
    recipientId,
    senderName,
    senderRole,
    messageContent,
    roomId,
  }) {
    try {
      // Get recipient user details
      const recipient = await User.findById(recipientId).select(
        "email name partner_1 partner_2 role"
      );

      if (!recipient || !recipient.email) {
        console.log(`No email found for user: ${recipientId}`);
        return false;
      }

      // Determine recipient name and notification type
      const recipientName =
        recipient.name || recipient.partner_1 || recipient.partner_2 || "User";
      const isOfficiantMessage = senderRole === "officiant";

      // Truncate message content for preview
      const messagePreview =
        messageContent.length > 100
          ? messageContent.substring(0, 100) + "..."
          : messageContent;

      // Create chat link
      const chatLink = `${process.env.FRONTEND_URL}/dashboard/discussions`;

      // Email template based on sender type
      const emailSubject = isOfficiantMessage
        ? `New message from ${senderName} (Officiant) - Erie Wedding Officiants`
        : `New message from ${senderName} - Erie Wedding Officiants`;

      const emailHtml = this.generateEmailTemplate({
        recipientName,
        senderName,
        senderRole,
        messagePreview,
        chatLink,
        isOfficiantMessage,
      });

      // Send email
      const mailOptions = {
        from: `"Erie Wedding Officiants" <${process.env.EMAIL_USER}>`,
        to: recipient.email,
        subject: emailSubject,
        html: emailHtml,
      };

      await this.transporter.sendMail(mailOptions);

      console.log(
        `📧 Offline notification sent to ${recipient.email} for message from ${senderName}`
      );
      return true;
    } catch (error) {
      console.error("Error sending offline message notification:", error);
      return false;
    }
  }

  /**
   * Generate HTML email template for offline message notifications
   */
  generateEmailTemplate({
    recipientName,
    senderName,
    senderRole,
    messagePreview,
    chatLink,
    isOfficiantMessage,
  }) {
    const senderTitle = isOfficiantMessage ? "Wedding Officiant" : "Client";
    const iconColor = isOfficiantMessage ? "#4CAF50" : "#2196F3";
    const gradientColors = isOfficiantMessage
      ? "linear-gradient(90deg, #4CAF50, #45a049)"
      : "linear-gradient(90deg, #2196F3, #1976D2)";

    return `
    <!DOCTYPE html>
    <html lang="en" style="margin:0;padding:0;">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>New Message Notification</title>
      </head>
      <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f7f9fc;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f7f9fc; padding:40px 0;">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff; border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(90deg, #ffb347, #ffcc33); padding:25px; border-radius:12px 12px 0 0; text-align:center;">
                    <h1 style="margin:0; font-size:26px; color:#ffffff; font-weight:bold;">ERIE WEDDING OFFICIANTS</h1>
                    <p style="margin:8px 0 0 0; color:#ffffff; font-size:14px; opacity:0.9;">New Message Received</p>
                  </td>
                </tr>

                <!-- Message Icon -->
                <tr>
                  <td style="text-align:center; padding:30px 30px 20px 30px;">
                    <div style="width:60px; height:60px; background:${gradientColors}; border-radius:50%; margin:0 auto; display:flex; align-items:center; justify-content:center;">
                      <span style="color:white; font-size:28px;">💬</span>
                    </div>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:0 30px 30px 30px; text-align:left; color:#333333;">
                    <h2 style="color:${iconColor}; margin:0 0 20px 0; font-size:22px; text-align:center;">
                      New Message from ${senderName}
                    </h2>
                    
                    <div style="background:#f8f9fa; border-left:4px solid ${iconColor}; padding:20px; margin:20px 0; border-radius:0 8px 8px 0;">
                      <p style="margin:0 0 10px 0; font-size:14px; color:#666; font-weight:bold;">
                        From: ${senderName} (${senderTitle})
                      </p>
                      <p style="margin:0 0 10px 0; font-size:14px; color:#666;">
                        To: ${recipientName}
                      </p>
                      <hr style="border:none; border-top:1px solid #eee; margin:15px 0;">
                      <p style="margin:0; font-size:16px; line-height:1.5; color:#333;">
                        "${messagePreview}"
                      </p>
                    </div>

                    <p style="font-size:16px; line-height:1.6; color:#555555; text-align:center; margin:25px 0;">
                      You have a new message waiting for you. Click the button below to read and reply:
                    </p>

                    <!-- CTA Button -->
                    <div style="text-align:center; margin:30px 0;">
                      <a href="${chatLink}" target="_blank" style="background:${gradientColors}; color:#ffffff; text-decoration:none; padding:16px 32px; border-radius:30px; font-size:16px; font-weight:bold; display:inline-block; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
                        View Message & Reply
                      </a>
                    </div>

                    <div style="background:#fff3cd; border:1px solid #ffeaa7; border-radius:8px; padding:15px; margin:20px 0;">
                      <p style="margin:0; font-size:14px; color:#856404; text-align:center;">
                        <strong>💡 Quick Reply:</strong> You can reply directly from your phone or computer - no app download required!
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f8f9fa; text-align:center; padding:25px; border-radius:0 0 12px 12px; border-top:1px solid #eee;">
                    <p style="margin:0 0 10px 0; font-size:14px; color:#666;">
                      Stay connected with your wedding planning team
                    </p>
                    <p style="margin:0; font-size:12px; color:#999999;">
                      © ${new Date().getFullYear()} Erie Wedding Officiants. All rights reserved.
                    </p>
                    <p style="margin:10px 0 0 0; font-size:11px; color:#999999;">
                      This email was sent because you have an active conversation. To manage notifications, visit your account settings.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    `;
  }

  /**
   * Test email connectivity
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log("✅ Email service connected successfully");
      return true;
    } catch (error) {
      console.error("❌ Email service connection failed:", error);
      return false;
    }
  }
}

module.exports = new EmailService();
