// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- API ROUTES ---

// 1. Submit Lost Item Report
app.post('/api/lost-report', async (req, res) => {
    const { itemName, description, busRoute, reporterPhone, reporterEmail } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO lost_items (item_name, description, bus_route, reporter_phone, reporter_email) VALUES (?, ?, ?, ?, ?)',
            [itemName, description, busRoute, reporterPhone, reporterEmail]
        );
        res.json({ success: true, message: 'Report saved to database.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Database error.' });
    }
});

// 2. Get All Lost Items (For Staff)
app.get('/api/lost-items', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM lost_items ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Staff Update Item (Found)
app.post('/api/staff-update', async (req, res) => {
    const { id, location } = req.body;
    try {
        // Get item details first for SMS mock
        const [items] = await pool.execute('SELECT * FROM lost_items WHERE id = ?', [id]);
        if (items.length === 0) return res.status(404).json({ success: false, message: 'Item not found.' });

        const item = items[0];

        // Update status
        await pool.execute(
            'UPDATE lost_items SET status = ?, found_location = ? WHERE id = ?',
            ['Found', location, id]
        );

        // MOCK SMS LOGIC
        console.log(`📱 [SMS GATEWAY] Sending SMS to ${item.reporter_phone}: "Good News! Your ${item.item_name} was found at ${location}."`);

        res.json({ success: true, message: 'Item updated. SMS triggered.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating item.' });
    }
});

// 4. Create Reservation
app.post('/api/reserve', async (req, res) => {
    const { seatNumber, customerName, route } = req.body;
    try {
        await pool.execute(
            'INSERT INTO reservations (seat_number, customer_name, route_name, payment_status) VALUES (?, ?, ?, ?)',
            [seatNumber, customerName, route, 'Paid']
        );
        res.json({ success: true, message: 'Seat reserved successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Booking failed.' });
    }
});

// 5. Log Emergency
app.post('/api/emergency', async (req, res) => {
    const { location } = req.body;
    try {
        await pool.execute('INSERT INTO emergency_logs (location_data) VALUES (?)', [location]);
        res.json({ success: true, message: 'Emergency services alerted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error logging emergency.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`💾 Connected to MySQL Database`);
});
// Add this to your server.js file

// Staff Login Route
app.post('/api/staff-login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ? AND password = ? AND role IN (?, ?)',
            [email, password, 'staff', 'admin']
        );

        if (users.length > 0) {
            const user = users[0];
            // In production, use JWT tokens instead of simple strings
            const token = 'staff_' + Date.now() + '_' + user.id;
            
            res.json({
                success: true,
                token: token,
                name: user.name,
                role: user.role
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials or insufficient permissions'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Middleware to protect staff routes (optional for production)
function verifyStaff(req, res, next) {
    const token = req.headers['authorization'];
    if (!token || !token.startsWith('staff_')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
}