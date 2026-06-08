// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: process.env.EMAIL_PORT,
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// const sendEmail = async ({ to, subject, html }) => {
//   const mailOptions = {
//     from: process.env.EMAIL_FROM,
//     to,
//     subject,
//     html,
//   };
//   return await transporter.sendMail(mailOptions);
// };



const { SendMailClient } = require("zeptomail");

require('dotenv').config();


const client = new SendMailClient({
    url: "https://api.zeptomail.in/v1.1/email",
    token: process.env.ZEPTO_USER
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        const response = await client.sendMail({
            from: {
                address: process.env.EMAIL_FROM,
                name: process.env.EMAIL_FROM_NAME 
            },
            to: [
                {
                    email_address: {
                        address: to
                    }
                }
            ],
            subject,
            htmlbody: html
        });

        return response;
    } catch (error) {
        console.error("ZeptoMail Error:", error);
        throw error;
    }
};




const emailTemplates = {
  verifyEmail: (name, token) => ({
    subject: 'Verify Your Email - WalletApp',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#4F46E5;">Welcome to WalletApp, ${name}!</h2>
        <p>Please verify your email address to activate your account.</p>
        <a href="${process.env.APP_URL || 'http://localhost:5000'}/api/auth/verify-email/${token}"
           style="background:#4F46E5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0;">
          Verify Email
        </a>
        <p style="color:#888;font-size:13px;">This link expires in 24 hours. If you didn't register, ignore this email.</p>
      </div>
    `,
  }),

  otpEmail: (name, otp) => ({
    subject: 'Your OTP - WalletApp',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#4F46E5;">Login OTP</h2>
        <p>Hello ${name}, your OTP is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#4F46E5;margin:20px 0;">${otp}</div>
        <p style="color:#888;font-size:13px;">This OTP expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  }),

  depositApproved: (name, amount) => ({
    subject: 'Deposit Approved - WalletApp',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#16A34A;">Deposit Approved!</h2>
        <p>Hello ${name}, your deposit of <strong>₹${amount}</strong> has been approved and credited to your wallet.</p>
      </div>
    `,
  }),

  depositRejected: (name, amount, reason) => ({
    subject: 'Deposit Rejected - WalletApp',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#DC2626;">Deposit Rejected</h2>
        <p>Hello ${name}, your deposit of <strong>₹${amount}</strong> was rejected.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>
    `,
  }),

  withdrawalApproved: (name, amount) => ({
    subject: 'Withdrawal Approved - WalletApp',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#16A34A;">Withdrawal Approved!</h2>
        <p>Hello ${name}, your withdrawal of <strong>₹${amount}</strong> has been approved and will be processed shortly.</p>
      </div>
    `,
  }),

  withdrawalRejected: (name, amount, reason) => ({
    subject: 'Withdrawal Rejected - WalletApp',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#DC2626;">Withdrawal Rejected</h2>
        <p>Hello ${name}, your withdrawal of <strong>₹${amount}</strong> was rejected.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>
    `,
  }),

  taskApproved: (name, taskTitle, reward) => ({
    subject: 'Task Approved - WalletApp',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#16A34A;">Task Approved!</h2>
        <p>Hello ${name}, your submission for <strong>${taskTitle}</strong> has been approved.</p>
        <p>You have earned <strong>₹${reward}</strong> reward!</p>
      </div>
    `,
  }),

  taskRejected: (name, taskTitle, reason) => ({
    subject: 'Task Rejected - WalletApp',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#DC2626;">Task Rejected</h2>
        <p>Hello ${name}, your submission for <strong>${taskTitle}</strong> was rejected.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
