const nodemailer = require('nodemailer');
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  FRONTEND_URL
} = require('../config/env');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT == 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const sendWelcomeEmail = async (userEmail, userName, verificationToken) => {
  try {
    const transporter = createTransporter();
    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: EMAIL_FROM,
      to: userEmail,
      subject: 'Welcome to PTET! Please verify your email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Welcome, ${userName}!</h2>
          <p>Thank you for registering. To get started, please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>Best regards,<br>PTET Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome/Verification email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

const sendPasswordResetEmail = async (userEmail, resetToken) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: EMAIL_FROM,
      to: userEmail,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Password Reset</h2>
          <p>You requested a password reset. Please click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>Best regards,<br>PTET Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending password reset email:', error);
  }
};

const sendTestReminderEmail = async (userEmail, userName, testDate) => {
  try {
    const transporter = createTransporter();
    const formattedDate = new Date(testDate).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const mailOptions = {
      from: EMAIL_FROM,
      to: userEmail,
      subject: 'Your PTET Exam is in 3 days! 🎯',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Hello, ${userName}!</h2>
          <p>This is a quick reminder that your PTET exam is scheduled for <strong>${formattedDate}</strong>.</p>
          <p>You have 3 days left! Here are a few last-minute tips:</p>
          <ul>
            <li>Review your weak areas based on your recent mock tests.</li>
            <li>Get plenty of rest the night before.</li>
            <li>Ensure you have all necessary documents ready for test day.</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" style="background-color: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Go to Dashboard</a>
          </div>
          <p>We believe in you! Best of luck!</p>
          <p>Best regards,<br>PTET Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Test reminder email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending test reminder email:', error);
  }
};

const sendWeeklyProgressEmail = async (userEmail, userName, stats) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: EMAIL_FROM,
      to: userEmail,
      subject: 'Your Weekly PTET Progress 📊',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Hi, ${userName}!</h2>
          <p>Here is your progress summary for the past week:</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p> <strong>Current Streak:</strong> ${stats.streakDays} days</p>
            <p> <strong>Mock Tests Taken:</strong> ${stats.testsTaken}</p>
            <p> <strong>Average Score:</strong> ${stats.averageScore ? stats.averageScore.toFixed(1) : 'N/A'}</p>
          </div>
          <p>Keep up the great work! Consistent practice is the key to achieving your target score.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Continue Studying</a>
          </div>
          <p>Best regards,<br>PTET Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Weekly progress email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending weekly progress email:', error);
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendTestReminderEmail,
  sendWeeklyProgressEmail,
};
