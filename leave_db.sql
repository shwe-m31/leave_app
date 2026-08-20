
-- Create and select database
CREATE DATABASE IF NOT EXISTS `leave_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `leave_db`;

-- ============================================================
--  TABLE: users
--  Stores student and admin login credentials
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`                   INT          NOT NULL AUTO_INCREMENT,
  `name`                 VARCHAR(100) NOT NULL,
  `email`                VARCHAR(100) NOT NULL,
  `password`             VARCHAR(255) NOT NULL,
  `role`                 ENUM('student','admin') NOT NULL DEFAULT 'student',
  `department`           VARCHAR(100) DEFAULT NULL,
  `attendance_percentage` DECIMAL(5,2) DEFAULT 100.00,
  `admin_name`           VARCHAR(100) DEFAULT NULL,
  `created_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  TABLE: leave_requests
--  Stores all leave applications submitted by students
-- ============================================================
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `stud_id`   INT          NOT NULL,
  `from_date` DATE         NOT NULL,
  `to_date`   DATE         NOT NULL,
  `reason`    TEXT         NOT NULL,
  `status`    ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`stud_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  SEED DATA: Admin account
--  Email : priya@gmail.com
--  Password : admin123
-- ============================================================
INSERT IGNORE INTO `users` (`name`, `email`, `password`, `role`) VALUES
  ('Priya', 'priya@gmail.com', 'admin123', 'admin');

-- ============================================================
--  SEED DATA: 30 Student accounts with realistic data
--  Password for all students: student123
-- ============================================================
INSERT IGNORE INTO `users` (`name`, `email`, `password`, `role`, `department`, `attendance_percentage`, `admin_name`) VALUES
('Arjun Sharma', 'arjun.sharma@example.com', 'student123', 'student', 'Computer Science', 100.00, 'Priya'),
('Sneha Patel', 'sneha.patel@example.com', 'student123', 'student', 'Computer Science', 98.50, 'Priya'),
('Rahul Verma', 'rahul.verma@example.com', 'student123', 'student', 'Mechanical Engineering', 95.00, 'Priya'),
('Priya Singh', 'priya.singh@example.com', 'student123', 'student', 'Electrical Engineering', 97.00, 'Priya'),
('Amit Kumar', 'amit.kumar@example.com', 'student123', 'student', 'Civil Engineering', 96.50, 'Priya'),
('Neha Gupta', 'neha.gupta@example.com', 'student123', 'student', 'Computer Science', 99.00, 'Priya'),
('Vikram Reddy', 'vikram.reddy@example.com', 'student123', 'student', 'Electronics', 94.00, 'Priya'),
('Anjali Mehta', 'anjali.mehta@example.com', 'student123', 'student', 'Information Technology', 98.00, 'Priya'),
('Rajesh Joshi', 'rajesh.joshi@example.com', 'student123', 'student', 'Mechanical Engineering', 93.50, 'Priya'),
('Kavita Nair', 'kavita.nair@example.com', 'student123', 'student', 'Computer Science', 97.50, 'Priya'),
('Suresh Iyer', 'suresh.iyer@example.com', 'student123', 'student', 'Electrical Engineering', 95.50, 'Priya'),
('Deepa Rao', 'deepa.rao@example.com', 'student123', 'student', 'Civil Engineering', 96.00, 'Priya'),
('Manoj Desai', 'manoj.desai@example.com', 'student123', 'student', 'Electronics', 94.50, 'Priya'),
('Lakshmi Pillai', 'lakshmi.pillai@example.com', 'student123', 'student', 'Information Technology', 98.50, 'Priya'),
('Ravi Chauhan', 'ravi.chauhan@example.com', 'student123', 'student', 'Mechanical Engineering', 92.00, 'Priya'),
('Meena Srinivasan', 'meena.srinivasan@example.com', 'student123', 'student', 'Computer Science', 99.50, 'Priya'),
('Karthik Krishnan', 'karthik.krishnan@example.com', 'student123', 'student', 'Electrical Engineering', 95.00, 'Priya'),
('Divya Mukherjee', 'divya.mukherjee@example.com', 'student123', 'student', 'Civil Engineering', 97.00, 'Priya'),
('Sunil Bhat', 'sunil.bhat@example.com', 'student123', 'student', 'Electronics', 93.00, 'Priya'),
('Pooja Kapoor', 'pooja.kapoor@example.com', 'student123', 'student', 'Information Technology', 96.50, 'Priya'),
('Abhishek Bansal', 'abhishek.bansal@example.com', 'student123', 'student', 'Computer Science', 94.00, 'Priya'),
('Ritika Malhotra', 'ritika.malhotra@example.com', 'student123', 'student', 'Mechanical Engineering', 98.00, 'Priya'),
('Gaurav Saxena', 'gaurav.saxena@example.com', 'student123', 'student', 'Electrical Engineering', 95.50, 'Priya'),
('Sonia Khanna', 'sonia.khanna@example.com', 'student123', 'student', 'Civil Engineering', 97.50, 'Priya'),
('Tarun Ahuja', 'tarun.ahuja@example.com', 'student123', 'student', 'Electronics', 93.50, 'Priya'),
('Nisha Mathur', 'nisha.mathur@example.com', 'student123', 'student', 'Information Technology', 99.00, 'Priya'),
('Vishal Sethi', 'vishal.sethi@example.com', 'student123', 'student', 'Computer Science', 96.00, 'Priya'),
('Ruchi Tandon', 'ruchi.tandon@example.com', 'student123', 'student', 'Mechanical Engineering', 94.50, 'Priya'),
('Mohit Arora', 'mohit.arora@example.com', 'student123', 'student', 'Electrical Engineering', 97.00, 'Priya'),
('Preeti Chawla', 'preeti.chawla@example.com', 'student123', 'student', 'Civil Engineering', 95.00, 'Priya');

-- ============================================================
--  SEED DATA: Sample leave requests with realistic statuses
-- ============================================================
INSERT IGNORE INTO `leave_requests` (`stud_id`, `from_date`, `to_date`, `reason`, `status`) VALUES
(2, '2025-03-10', '2025-03-12', 'Family function', 'Approved'),
(3, '2025-03-15', '2025-03-15', 'Medical appointment', 'Pending'),
(4, '2025-03-20', '2025-03-22', 'Personal emergency', 'Rejected'),
(5, '2025-03-25', '2025-03-26', 'Attending a seminar', 'Approved'),
(6, '2025-04-01', '2025-04-02', 'Family wedding', 'Rejected'),
(7, '2025-04-05', '2025-04-05', 'Doctor appointment', 'Pending'),
(8, '2025-04-10', '2025-04-12', 'Out of station', 'Approved'),
(9, '2025-04-15', '2025-04-15', 'Health issues', 'Rejected'),
(10, '2025-04-20', '2025-04-21', 'Personal work', 'Pending'),
(11, '2025-05-01', '2025-05-03', 'Conference attendance', 'Approved'),
(12, '2025-05-10', '2025-05-10', 'Family emergency', 'Rejected'),
(13, '2025-05-15', '2025-05-17', 'Personal work', 'Pending'),
(14, '2025-05-20', '2025-05-20', 'Medical checkup', 'Approved'),
(15, '2025-05-25', '2025-05-26', 'Interview preparation', 'Rejected'),
(16, '2025-06-01', '2025-06-02', 'Family function', 'Pending'),
(17, '2025-06-05', '2025-06-05', 'Seminar attendance', 'Approved'),
(18, '2025-06-10', '2025-06-12', 'Personal emergency', 'Rejected'),
(19, '2025-06-15', '2025-06-17', 'Conference travel', 'Pending'),
(20, '2025-06-20', '2025-06-20', 'Medical appointment', 'Approved');
