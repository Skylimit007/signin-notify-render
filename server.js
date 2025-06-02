require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google Auth
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Middleware
app.use(cors({
    origin: [
        'https://www.nextedgeinnovations.org',
        'http://localhost'
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

app.use(express.json());

// Function to send email notification
async function sendLoginNotification(user) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.NOTIFICATION_EMAIL, // Where you want to receive notifications
            subject: 'New User Login - NextEdge Innovations',
            html: `
                <h2>New User Login</h2>
                <p>A user has signed in to NextEdge Innovations:</p>
                <ul>
                    <li><strong>Name:</strong> ${user.name}</li>
                    <li><strong>Email:</strong> ${user.email}</li>
                    <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                </ul>
                <p>User ID: ${user.id}</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Login notification email sent');
    } catch (error) {
        console.error('Error sending email notification:', error);
    }
}

// Login endpoint
app.post('/login', async (req, res) => {
    try {
        // 1. Validate request
        if (!req.body.credential) {
            return res.status(400).json({
                success: false,
                error: 'Missing Google credential'
            });
        }

        // 2. Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: req.body.credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        
        if (!payload.email_verified) {
            return res.status(401).json({
                success: false,
                error: 'Google email not verified'
            });
        }

        // 3. Prepare user data
        const user = {
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture
        };

        // 4. Log successful login
        console.log('User logged in:', user);

        // 5. Send email notification (don't await to avoid delaying response)
        sendLoginNotification(user).catch(console.error);

        // 6. Respond with user data
        res.json({
            success: true,
            user: user
        });
        
    } catch (error) {
        console.error('Authentication error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        service: 'NextEdge Authentication',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS configured for: ${process.env.ALLOWED_ORIGINS || 'default origins'}`);
});
