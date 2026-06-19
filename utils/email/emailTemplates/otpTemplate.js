const { sendEmail } = require("../emailService");

/**
 * Generate OTP Email Template
 * @param {Object} data
 * @returns {string}
 */

const generateOtpEmail = ({ otp }) => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>MDPay OTP</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#0B0F14;
  font-family:Arial,sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:50px 20px;">

<table width="460" cellpadding="0" cellspacing="0" style="
  background:#111827;
  border-radius:18px;
  padding:40px 32px;
">

<tr>
<td align="center">

<div style="
  font-size:34px;
  font-weight:700;
  color:#00E89A;
  margin-bottom:10px;
">
MDPay
</div>

<p style="
  margin:0 0 32px;
  color:#9CA3AF;
  font-size:14px;
">
Secure • Fast • Smart Payments
</p>

<p style="
  margin:0 0 18px;
  color:#FFFFFF;
  font-size:18px;
">
Login Verification
</p>

<div style="
  background:#0B1220;
  border:1px solid #1F2937;
  border-radius:14px;
  padding:18px;
  margin-bottom:22px;
">

<div style="
  font-size:34px;
  letter-spacing:8px;
  font-weight:700;
  color:#00E89A;
">
${otp}
</div>

</div>

<p style="
  margin:0 0 20px;
  color:#D1D5DB;
  font-size:14px;
  line-height:1.8;
">
Use this OTP to securely log in to your MDPay account.
</p>

<p style="
  margin:0;
  color:#6B7280;
  font-size:12px;
">
If you did not request this code, please ignore this email.
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
};



/**
 * Send OTP Email
 * @param {string} recipientEmail
 * @param {string} otp
 */
const sendOtpEmail = async (recipientEmail, otp) => {
  try {
    const html = generateOtpEmail({ otp });

    const result = await sendEmail({
      to: recipientEmail,
      subject: `Your OTP Code`,
      html,
      text: `Your OTP is ${otp}. It is valid for 15 minutes. Do not share it with anyone.`,
    });

    console.log("✓ OTP email sent:", recipientEmail);

    return result;
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error);
    throw error;
  }
};

module.exports = {
  sendOtpEmail,
};