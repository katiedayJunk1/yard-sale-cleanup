const { Resend } = require('resend');

class EmailService {
  constructor() {
    this.resend = null;
    this.initialized = false;
  }

  async initialize() {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not set. Emails will be skipped.');
      this.initialized = false;
      return;
    }

    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.initialized = true;
    console.log('✅ Resend email service initialized');
  }

  async sendEmail(to, subject, text, html) {
    if (!this.initialized) {
      console.warn(`⚠️ Email skipped (service not initialized). To: ${to} Subject: ${subject}`);
      return { skipped: true };
    }

    const recipients = Array.isArray(to)
      ? to
      : String(to)
          .split(',')
          .map((email) => email.trim())
          .filter(Boolean);

    try {
      const result = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'The Junkluggers <onboarding@resend.dev>',
        to: recipients,
        subject,
        text,
        html,
      });

      if (result.error) {
        console.error('Resend email error:', result.error);
        throw new Error(result.error.message || 'Resend email failed');
      }

      console.log('Email sent:', result.data?.id || result);
      return result;
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();


























const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
                console.warn('⚠️  EMAIL_USER / EMAIL_PASSWORD not set. Emails will be skipped.');
                this.initialized = false;
                return;
            }

            this.transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE || 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });

            // Verify connection
            await this.transporter.verify();
            console.log('✅ Email service initialized');
            this.initialized = true;
       } catch (error) {
            console.error('Email service initialization error:', error);
            console.warn('⚠️ Continuing without email (service not initialized).');
            this.initialized = false;
            return;
        }
    }

    async sendEmail(to, subject, text, html) {
        if (!this.initialized) {
            console.warn(`⚠️  Email skipped (service not initialized). To: ${to} Subject: ${subject}`);
            return { skipped: true };
        }

        try {
            const info = await this.transporter.sendMail({
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to,
                subject,
                text,
                html
            });
            
            console.log('Email sent:', info.messageId);
            return info;
        } catch (error) {
            console.error('Email sending error:', error);
            throw error;
        }
    }

    async sendSaleNotification(email, itemName, price) {
        const subject = `🎉 Item Sold: ${itemName}`;
        const text = `Congratulations! Your item "${itemName}" has been sold for $${price}.`;
        const html = `<h2>Item Sold!</h2><p>Your item <strong>${itemName}</strong> has been sold for <strong>$${price}</strong>.</p>`;
        
        return this.sendEmail(email, subject, text, html);
    }
}

module.exports = new EmailService();
