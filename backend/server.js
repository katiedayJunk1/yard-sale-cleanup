require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database on startup
let dbConnected = false;

(async () => {
    try {
        await db.connect();
        dbConnected = true;
        console.log('🚀 Database initialized');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
})();

// Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Backend is running',
        database: dbConnected ? 'Connected' : 'Disconnected'
    });
});

app.get('/api', (req, res) => {
    res.json({ message: 'Junk Deal API v1.0' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Junk Deal Backend running on port ${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}/api`);
});

module.exports = app;