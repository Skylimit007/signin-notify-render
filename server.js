require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'https://www.nextedgeinnovations.org' // Update with your domain
}));
app.use(express.json());

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  }
});

// Login notification endpoint
app.post('/login-notification', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    console.log(`New login from: ${name} <${email}>`);

    // Send email notification
    await transporter.sendMail({
      from: `NextEdge Notifications <${process.env.EMAIL_USER}>`,
      to: process.env.NOTIFICATION_EMAIL,
      subject: 'New User Login',
      html: `
        <h2>New Login Detected</h2>
        <p><strong>User:</strong> ${name || 'Unknown'} (${email})</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      `,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
