'use server';

import nodemailer from 'nodemailer';

/**
 * Email configuration from environment variables
 */
const emailConfig = {
    host: process.env.SMTP_SERVER,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // True for 465, false for 587
    auth: {
        user: process.env.SMTP_FROM,
        pass: process.env.SMTP_PASS,
    },
};

/**
 * Create and verify SMTP transporter
 */
async function createTransporter() {
    const transporter = nodemailer.createTransport(emailConfig);

    // Verify connection configuration
    try {
        await transporter.verify();
        console.log('[Email] SMTP server is ready to send emails');
        return transporter;
    } catch (error) {
        console.error('[Email] SMTP connection error:', error);
        throw new Error('Failed to connect to SMTP server');
    }
}

/**
 * Send an email using SMTP
 */
export async function sendEmail({
    to,
    subject,
    html,
    text,
}: {
    to: string;
    subject: string;
    html: string;
    text?: string;
}) {
    try {
        const transporter = await createTransporter();

        const info = await transporter.sendMail({
            from: `"TrainEasy" <${process.env.SMTP_FROM}>`,
            to,
            subject,
            html,
            text: text || '', // Fallback plain text version
        });

        console.log('[Email] Message sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error('[Email] Error sending email:', error);
        return {
            success: false,
            error: error.message || 'Failed to send email',
        };
    }
}
