// server.js
const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const NOTIFY_TO = process.env.NOTIFY_TO;

if (!CLIENT_ID || !EMAIL_USER || !EMAIL_PASS || !NOTIFY_TO) {
  console.error('Missing one of GOOGLE_CLIENT_ID, EMAIL_USER, EMAIL_PASS, or NOTIFY_TO');
  process.exit(1);
}

const client = new OAuth2Client(CLIENT_ID);
const app = express();
app.use(express.json());

app.post('/notify-signin', async (req, res) => {
  const { token, timestamp } = req.body || {};
  if (!token || !timestamp) {
    return res.status(400).json({ error: 'token and timestamp are required' });
  }

  try {
    // Verify token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    const mailOptions = {
      from: EMAIL_USER,
      to: NOTIFY_TO,
      subject: 'New Sign-In Alert',
      text: `User ${email} signed in at ${timestamp}`,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: 'Notification sent' });
  } catch (err) {
    console.error('Error in /notify-signin:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'OK' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
