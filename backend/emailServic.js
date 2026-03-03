const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
    }

    async initialize() {
        try {
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
            throw error;
        }
    }

    async sendEmail(to, subject, text, html) {
        if (!this.initialized) {
            throw new Error('Email service not initialized');
        }

        try {
            const info = await this.transporter.sendMail({
                from: process.env.EMAIL_USER,
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