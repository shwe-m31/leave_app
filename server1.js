const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS Configuration - Allow both local and production origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
];

// Add production URL from environment if available
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(null, false);
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars.join(', '));
    console.error('Please check your .env file or environment configuration.');
    process.exit(1);
}

// MySQL Database Configuration with SSL support for Aiven
const dbConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Add SSL configuration for Aiven or if specified
if (process.env.DB_SSL === 'true' || process.env.DB_HOST.includes('aiven')) {
    // For Aiven, we need proper SSL configuration
    dbConfig.ssl = {
        rejectUnauthorized: false // Required for Aiven's self-signed certificates
    };
}

// Create connection pool instead of single connection
const db = mysql.createPool(dbConfig);

// Test database connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:');
        console.error('Host:', process.env.DB_HOST);
        console.error('Port:', process.env.DB_PORT);
        console.error('User:', process.env.DB_USER);
        console.error('Database:', process.env.DB_NAME);
        console.error('Error:', err.message);
        
        // Don't exit in development, but log the error clearly
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    } else {
        console.log('Connected to MySQL successfully');
        console.log('Host:', process.env.DB_HOST);
        console.log('Port:', process.env.DB_PORT);
        console.log('Database:', process.env.DB_NAME);
        connection.release();
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
            console.error('Error during login:', err.message);
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
    const sql = "SELECT id, name, email, department, admin_name FROM users WHERE id = ?";
    
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching student profile:', err.message);
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
            console.error('Error fetching students:', err.message);
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
            console.error('Error fetching student count:', err.message);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json({ count: results[0].count });
        }
    });
});

// Fetch All Leave Requests for Admin (all statuses, sorted by created_at DESC)
app.get('/api/leave-requests', (req, res) => {
    const sql = "SELECT lr.*, u.name as student_name FROM leave_requests lr JOIN users u ON lr.stud_id = u.id ORDER BY lr.created_at DESC";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching leave requests:', err.message);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            // Add Time Expired status for pending requests whose leave period has passed
            const today = new Date();
            const processedResults = results.map(request => {
                let processedRequest = { ...request };
                
                if (request.status === 'Pending') {
                    const toDate = new Date(request.to_date);
                    // If the leave period has already passed, mark as Time Expired
                    if (toDate < today) {
                        processedRequest.displayStatus = 'TIME EXPIRED';
                        processedRequest.expired = true;
                    } else {
                        processedRequest.displayStatus = request.status;
                        processedRequest.expired = false;
                    }
                } else {
                    processedRequest.displayStatus = request.status;
                    processedRequest.expired = false;
                }
                
                return processedRequest;
            });
            
            res.json(processedResults);
        }
    });
});

// Approve or Reject Leave Request
app.post('/api/update-leave-status', (req, res) => {
    const { id, status } = req.body;
    
    // Update leave status
    const updateSql = "UPDATE leave_requests SET status = ? WHERE id = ?";
    db.query(updateSql, [status, id], (err, result) => {
        if (err) {
            console.error('Error updating leave request status:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        
        // Recalculate attendance for the student based on all approved leaves
        const getLeaveSql = "SELECT stud_id FROM leave_requests WHERE id = ?";
        db.query(getLeaveSql, [id], (err, results) => {
            if (err) {
                console.error('Error fetching leave request:', err.message);
                return;
            }
            
            if (results.length === 0) {
                res.json({ message: 'Leave request updated successfully' });
                return;
            }
            
            const studId = results[0].stud_id;
            
            // Get all approved leave requests for this student
            const getAllApprovedSql = "SELECT * FROM leave_requests WHERE stud_id = ? AND status = 'Approved'";
            db.query(getAllApprovedSql, [studId], (err, approvedResults) => {
                if (err) {
                    console.error('Error fetching approved leaves:', err.message);
                    return;
                }
                
                // Calculate total days absent from all approved leaves
                let totalDaysAbsent = 0;
                approvedResults.forEach(request => {
                    const fromDate = new Date(request.from_date);
                    const toDate = new Date(request.to_date);
                    const leaveDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
                    totalDaysAbsent += leaveDays;
                });
                
                // Calculate new attendance
                const workingDays = 100;
                const attendanceDays = Math.max(0, workingDays - totalDaysAbsent);
                const newAttendance = (attendanceDays / workingDays) * 100;
                
                // Update student's attendance
                const updateAttendanceSql = "UPDATE users SET attendance_percentage = ? WHERE id = ?";
                db.query(updateAttendanceSql, [newAttendance, studId], (err) => {
                    if (err) {
                        console.error('Error updating attendance:', err.message);
                    }
                });
            });
        });
        
        res.json({ message: 'Leave request updated successfully' });
    });
});

// Get student attendance data for specific academic year
app.get('/api/student-attendance-data', (req, res) => {
    const userId = req.query.userId;
    const academicYear = req.query.academicYear;
    
    // Academic year configuration
    const academicYearConfig = {
        '2024-2025': { start: '2024-08-01', end: '2025-06-30', semesterDays: 180, workingDays: 100 },
        '2025-2026': { start: '2025-08-01', end: '2026-05-31', semesterDays: 180, workingDays: 100 },
        '2026-2027': { start: '2026-08-01', end: '2027-05-31', semesterDays: 180, workingDays: 100 }
    };
    
    const config = academicYearConfig[academicYear] || academicYearConfig['2026-2027'];
    
    // Get approved leave requests for the academic year
    let sql = "SELECT * FROM leave_requests WHERE stud_id = ? AND status = 'Approved'";
    const params = [userId];
    
    if (academicYear && academicYear !== 'all') {
        const [startYear, endYear] = academicYear.split('-').map(Number);
        const startDate = `${startYear}-08-01`;
        const endDate = `${endYear}-06-30`;
        
        sql += " AND from_date >= ? AND from_date <= ?";
        params.push(startDate, endDate);
    }
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching leave requests:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        
        // Calculate days absent from approved leave
        let daysAbsent = 0;
        results.forEach(request => {
            const fromDate = new Date(request.from_date);
            const toDate = new Date(request.to_date);
            const leaveDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
            daysAbsent += leaveDays;
        });
        
        // Calculate attendance
        const workingDays = config.workingDays;
        const attendanceDays = Math.max(0, workingDays - daysAbsent);
        const attendancePercentage = (attendanceDays / workingDays) * 100;
        
        res.json({
            semesterDays: config.semesterDays,
            workingDays: workingDays,
            daysAbsent: daysAbsent,
            attendanceDays: attendanceDays,
            attendancePercentage: attendancePercentage
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
            console.error("Error inserting leave request:", err.message);
            res.status(500).json({ error: "Internal server error" });
        } else {
            res.json({ message: "Leave request submitted successfully" });
        }
    });
});

// Get student leave history (all statuses)
app.get('/api/student-leave-history', (req, res) => {
    const userId = req.query.userId;
    const academicYear = req.query.academicYear;
    
    let sql = "SELECT * FROM leave_requests WHERE stud_id = ?";
    const params = [userId];
    
    if (academicYear && academicYear !== 'all') {
        // Academic year filtering based on academic year boundaries
        const [startYear, endYear] = academicYear.split('-').map(Number);
        const startDate = `${startYear}-08-01`;
        const endDate = `${endYear}-06-30`;
        
        sql += " AND from_date >= ? AND from_date <= ?";
        params.push(startDate, endDate);
    }
    
    sql += " ORDER BY created_at DESC";
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching leave history:', err.message);
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.json(results);
        }
    });
});

// Get academic year attendance data for student
app.get('/api/student-attendance-data', (req, res) => {
    const userId = req.query.userId;
    const academicYear = req.query.academicYear;
    
    // Academic year configuration
    const academicYearConfig = {
        '2024-2025': { start: '2024-08-01', end: '2025-06-30', semesterDays: 180, workingDays: 100 },
        '2025-2026': { start: '2025-08-01', end: '2026-05-31', semesterDays: 180, workingDays: 100 },
        '2026-2027': { start: '2026-08-01', end: '2027-05-31', semesterDays: 180, workingDays: 100 }
    };
    
    const config = academicYearConfig[academicYear] || academicYearConfig['2026-2027'];
    
    // Get approved leave requests for the academic year
    let sql = "SELECT * FROM leave_requests WHERE stud_id = ? AND status = 'Approved'";
    const params = [userId];
    
    if (academicYear && academicYear !== 'all') {
        const [startYear, endYear] = academicYear.split('-').map(Number);
        const startDate = `${startYear}-08-01`;
        const endDate = `${endYear}-06-30`;
        
        sql += " AND from_date >= ? AND from_date <= ?";
        params.push(startDate, endDate);
    }
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching leave requests:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        
        // Calculate days absent from approved leave
        let daysAbsent = 0;
        results.forEach(request => {
            const fromDate = new Date(request.from_date);
            const toDate = new Date(request.to_date);
            const leaveDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
            daysAbsent += leaveDays;
        });
        
        // Calculate attendance
        const workingDays = config.workingDays;
        const attendanceDays = Math.max(0, workingDays - daysAbsent);
        const attendancePercentage = (attendanceDays / workingDays) * 100;
        
        res.json({
            semesterDays: config.semesterDays,
            workingDays: workingDays,
            daysAbsent: daysAbsent,
            attendanceDays: attendanceDays,
            attendancePercentage: attendancePercentage
        });
    });
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
