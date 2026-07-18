const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('⚠️ EMAIL_USER / EMAIL_PASSWORD not set. Emails will be skipped.');
        this.initialized = false;
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
      });

      await this.transporter.verify();
      console.log('✅ Gmail SMTP email service initialized');
      this.initialized = true;
    } catch (error) {
      console.error('Email service initialization error:', error);
      console.warn('⚠️ Continuing without email (service not initialized).');
      this.initialized = false;
    }
  }

  async sendEmail(to, subject, text, html) {
    if (!this.initialized) {
      console.warn(`⚠️ Email skipped (service not initialized). To: ${to} Subject: ${subject}`);
      return { skipped: true };
    }

    const recipients = Array.isArray(to)
      ? to.join(',')
      : String(to)
          .split(',')
          .map((email) => email.trim())
          .filter(Boolean)
          .join(',');

    try {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: recipients,
        subject,
        text,
        html,
      });

      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
