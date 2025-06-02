require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google Auth
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(cors({
    origin: [
        'https://www.nextedgeinnovations.org',
        'http://localhost' // Add development origins
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

app.use(express.json());

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

        // 3. Log successful login
        console.log('User logged in:', {
            name: payload.name,
            email: payload.email,
            time: new Date().toISOString()
        });

        // 4. Respond with user data
        res.json({
            success: true,
            user: {
                id: payload.sub,
                name: payload.name,
                email: payload.email,
                picture: payload.picture
            }
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
