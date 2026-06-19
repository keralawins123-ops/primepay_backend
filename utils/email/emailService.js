
const { SendMailClient } = require("zeptomail");
const config = require("../../config");



// const transporter = createTransporter();

/**
 * Send Email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @param {Array} options.attachments - Attachments (optional)
 */



const client = new SendMailClient({
    url: "https://api.zeptomail.in/v1.1/email",
    token: "Zoho-enczapikey PHtE6r0LQe7sjGR5+hMGsKOxRcenNtgqqO5hLAJA5IsTD/ALGk0Dr9AtxmO0rhgiU/JAF/7Iyo49trmYu7+HIz6/MD5PWmqyqK3sx/VYSPOZsbq6x00ft1gedE3aUYDmddNt1SzVu9reNA=="
});







const sendEmail = async (options) => {
    try {
        const response = await client.sendMail({
            from: {
                address: "noreply@mdpay.info",
                // config.email.fromEmail,
                name: "mdpay"
            },
            to: [
                {
                    email_address: {
                        address: options.to,
                        name: ""
                    }
                }
            ],
            subject: options.subject,
            htmlbody: options.html
        });

        console.log("Email sent via ZeptoMail API");
        return { success: true, response };

    } catch (error) {
        console.error("❌ ZeptoMail API Error:", error);
        throw error;
    }
};





module.exports = {
    sendEmail
};
