require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { jwtVerify } = require('jose');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Login notification endpoint
app.post('/login-notification', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Missing credential' });
    }

    // Verify and decode JWT
    const { payload } = await jwtVerify(
      credential,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );

    const { name, email } = payload;

    // Send email
    await transporter.sendMail({
      from: `NextEdge Notifications <${process.env.EMAIL_USER}>`,
      to: process.env.NOTIFICATION_EMAIL,
      subject: 'New User Login',
      html: `
        <h2>New Login Detected</h2>
        <p><strong>User:</strong> ${name || 'Unknown'} (${email})</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>IP Address:</strong> ${req.ip}</p>
      `,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
