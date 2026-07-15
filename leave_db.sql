-- ============================================================
--  Leave Management System — Database Setup
--  Database : leave_db
--  Compatible: MySQL 5.7+ / MariaDB 10.3+
--
--  HOW TO USE
--  ----------
--  Option A — MySQL CLI:
--    mysql -u root -p < leave_db.sql
--
--  Option B — phpMyAdmin / XAMPP:
--    1. Open phpMyAdmin
--    2. Click "Import" tab
--    3. Choose this file and click "Go"
--
--  After importing, start the server with:
--    node server1.js
-- ============================================================

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
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(100) NOT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `role`       ENUM('student','admin') NOT NULL DEFAULT 'student',
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  TABLE: leave_requests
--  Stores all leave applications submitted by students
-- ============================================================
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `stud_id`   VARCHAR(100) NOT NULL,
  `from_date` DATE         NOT NULL,
  `to_date`   DATE         NOT NULL,
  `reason`    TEXT         NOT NULL,
  `status`    ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  SEED DATA: Sample admin account
--  Username : admin
--  Password : admin123   (store hashed in production!)
-- ============================================================
INSERT IGNORE INTO `users` (`name`, `password`, `role`) VALUES
  ('admin',        'admin123',   'admin'),
  ('John Doe',     'student123', 'student'),
  ('Jane Smith',   'student123', 'student'),
  ('Mike Johnson', 'student123', 'student'),
  ('Emily Davis',  'student123', 'student');

-- ============================================================
--  SEED DATA: Sample leave requests
-- ============================================================
INSERT IGNORE INTO `leave_requests` (`stud_id`, `from_date`, `to_date`, `reason`, `status`) VALUES
  ('John Doe',     '2025-03-10', '2025-03-12', 'Family function',          'Approved'),
  ('Jane Smith',   '2025-03-15', '2025-03-15', 'Medical appointment',      'Pending'),
  ('Mike Johnson', '2025-03-20', '2025-03-22', 'Personal emergency',       'Rejected'),
  ('Emily Davis',  '2025-03-25', '2025-03-26', 'Attending a seminar',      'Pending');
