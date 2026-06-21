const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL Database Connection
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'leave_db',
    port:3307
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

// Default route for testing
app.get('/', (req, res) => {
    res.send('Welcome to the Leave Management System on port 3001');
});

// Fetch All Pending Leave Requests
app.get('/api/leave-requests', (req, res) => {
    const sql = "SELECT * FROM leave_requests WHERE status = 'Pending'";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching leave requests:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(results);
        }
    });
});

// Approve or Reject Leave Request
app.post('/api/update-leave-status', (req, res) => {
    const { id, status } = req.body;
    const sql = "UPDATE leave_requests SET status = ? WHERE id = ?";
    
    db.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error('Error updating leave request status:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json({ message: 'Leave request updated successfully' });
        }
    });
});

// 📌 New: Submit Leave Request
app.post('/api/submit-leave', (req, res) => {
    console.log("Received Request Body:", req.body);
    const { stud_id, from_date, to_date, reason, status } = req.body;

    if (!stud_id || !from_date || !to_date || !reason || !status) {
        console.error("Missing Fields:", { stud_id, from_date, to_date, reason, status });
        return res.status(400).json({ error: "All fields are required" });
    }

    const sql = "INSERT INTO leave_requests (stud_id, from_date, to_date, reason, status) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [stud_id, from_date, to_date, reason, status], (err, result) => {
        if (err) {
            console.error("Error inserting leave request:", err);
            res.status(500).json({ error: "Internal server error" });
        } else {
            res.json({ message: "Leave request submitted successfully" });
        }
    });
});

// Start Server
app.listen(3001, () => {
    console.log('Admin server running on port 3001');
});
