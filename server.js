require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(cors());
app.use(express.json());

// Email transporter with better configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify Google ID token
async function verifyGoogleToken(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  return ticket.getPayload();
}

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'NextEdge Login Notification Service',
    endpoints: {
      loginNotification: 'POST /login-notification',
      health: 'GET /health'
    }
  });
});

// Login notification endpoint
app.post('/login-notification', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Missing credential' });
    }

    // Verify Google token
    const payload = await verifyGoogleToken(credential);
    const { name, email } = payload;

    console.log(`Attempting to send email to ${process.env.NOTIFICATION_EMAIL}`);

    // Send email notification
    const mailOptions = {
      from: `NextEdge Notifications <${process.env.EMAIL_USER}>`,
      to: process.env.NOTIFICATION_EMAIL,
      subject: 'New User Login',
      html: `
        <h2>New Login Detected</h2>
        <p><strong>User:</strong> ${name || 'Unknown'} (${email})</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>IP Address:</strong> ${req.ip}</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);

    res.json({ 
      success: true,
      user: name,
      email: email
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Google Client ID: ${process.env.GOOGLE_CLIENT_ID}`);
  console.log(`Notification emails will be sent to: ${process.env.NOTIFICATION_EMAIL}`);
});
