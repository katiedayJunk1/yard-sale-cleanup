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
