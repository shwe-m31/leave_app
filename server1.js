const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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

// Login API
app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body;
    const sql = "SELECT * FROM users WHERE email = ? AND password = ? AND role = ?";
    
    db.query(sql, [email, password, role], (err, results) => {
        if (err) {
            console.error('Error during login:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else if (results.length > 0) {
            res.json({ message: 'Login successful', user: results[0] });
        } else {
            res.json({ message: 'Invalid credentials' });
        }
    });
});

// Get student profile data
app.get('/api/student-profile', (req, res) => {
    const userId = req.query.userId;
    const sql = "SELECT id, name, email, department, attendance_percentage, admin_name FROM users WHERE id = ?";
    
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching student profile:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(results[0] || {});
        }
    });
});

// Get all students for admin dashboard
app.get('/api/students', (req, res) => {
    const sql = "SELECT id, name, email, department, attendance_percentage, admin_name FROM users WHERE role = 'student'";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching students:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(results);
        }
    });
});

// Get student count
app.get('/api/student-count', (req, res) => {
    const sql = "SELECT COUNT(*) as count FROM users WHERE role = 'student'";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching student count:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json({ count: results[0].count });
        }
    });
});

// Fetch All Pending Leave Requests
app.get('/api/leave-requests', (req, res) => {
    const sql = "SELECT lr.*, u.name as student_name FROM leave_requests lr JOIN users u ON lr.stud_id = u.id WHERE lr.status = 'Pending'";
    
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
    
    // First, get the leave request details to calculate attendance
    const getLeaveSql = "SELECT * FROM leave_requests WHERE id = ?";
    db.query(getLeaveSql, [id], (err, results) => {
        if (err) {
            console.error('Error fetching leave request:', err);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        
        if (results.length === 0) {
            res.status(404).json({ error: 'Leave request not found' });
            return;
        }
        
        const leaveRequest = results[0];
        
        // Update leave status
        const updateSql = "UPDATE leave_requests SET status = ? WHERE id = ?";
        db.query(updateSql, [status, id], (err, result) => {
            if (err) {
                console.error('Error updating leave request status:', err);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }
            
            // If approved, update attendance
            if (status === 'Approved') {
                const fromDate = new Date(leaveRequest.from_date);
                const toDate = new Date(leaveRequest.to_date);
                const daysAbsent = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
                
                // Get student's current attendance
                const getStudentSql = "SELECT attendance_percentage FROM users WHERE id = ?";
                db.query(getStudentSql, [leaveRequest.stud_id], (err, studentResults) => {
                    if (err) {
                        console.error('Error fetching student attendance:', err);
                        return;
                    }
                    
                    const currentAttendance = studentResults[0]?.attendance_percentage || 100;
                    const workingDays = 100;
                    const attendanceReduction = (daysAbsent / workingDays) * 100;
                    const newAttendance = Math.max(0, currentAttendance - attendanceReduction);
                    
                    const updateAttendanceSql = "UPDATE users SET attendance_percentage = ? WHERE id = ?";
                    db.query(updateAttendanceSql, [newAttendance, leaveRequest.stud_id], (err) => {
                        if (err) {
                            console.error('Error updating attendance:', err);
                        }
                    });
                });
            }
            
            res.json({ message: 'Leave request updated successfully' });
        });
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

// Get student leave history (all statuses)
app.get('/api/student-leave-history', (req, res) => {
    const userId = req.query.userId;
    const year = req.query.year;
    
    let sql = "SELECT * FROM leave_requests WHERE stud_id = ?";
    const params = [userId];
    
    if (year && year !== 'all') {
        sql += " AND YEAR(from_date) = ?";
        params.push(year);
    }
    
    sql += " ORDER BY created_at DESC";
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching leave history:', err);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(results);
        }
    });
});

// Start Server
app.listen(3001, () => {
    console.log('Admin server running on port 3001');
});
