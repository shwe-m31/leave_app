const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// This script will run on the deployed server to migrate the database
// It uses the production environment variables to connect to Aiven

const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false // Allow self-signed certificates for Aiven
    } : undefined,
    multipleStatements: true // Enable multiple SQL statements
};

console.log('Starting database migration...');
console.log('Host:', config.host);
console.log('Port:', config.port);
console.log('Database:', config.database);
console.log('SSL:', config.ssl ? 'Enabled' : 'Disabled');

if (!config.host || !config.user || !config.password) {
    console.error('Missing required environment variables');
    console.error('Required: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
    process.exit(1);
}

const connection = mysql.createConnection(config);

connection.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
    
    console.log('Successfully connected to database');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'leave_db.sql');
    
    console.log('Using SQL file:', sqlFile);
    console.log('Target database:', config.database);
    
    if (!fs.existsSync(sqlFile)) {
        console.error('SQL file not found:', sqlFile);
        connection.end();
        process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('Reading SQL file:', sqlFile);
    
    // Remove USE statement since we're already connected to the database
    const cleanedSql = sql
        .replace(/CREATE DATABASE IF NOT EXISTS[^;]+;/g, '') // Remove CREATE DATABASE statements
        .replace(/USE `[^`]+`;/g, '') // Remove USE statements
        .replace(/--.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .trim();
    
    console.log('Executing SQL script as single query...');
    
    // Execute the entire SQL as a single query (MySQL supports multiple statements)
    connection.query(cleanedSql, (err) => {
        if (err) {
            // Check if it's a "table already exists" or "duplicate entry" error
            if (err.message.includes('already exists') || err.message.includes('Duplicate entry')) {
                console.log('Migration skipped (tables/data already exist)');
            } else {
                console.error('Migration failed:', err.message);
                connection.end();
                process.exit(1);
            }
        } else {
            console.log('SQL script executed successfully');
        }
        
        // Verify tables were created
        connection.query('SHOW TABLES', (err, results) => {
            if (err) {
                console.error('Failed to verify tables:', err.message);
                connection.end();
                process.exit(1);
            } else {
                console.log('📋 Final tables:', results.map(r => Object.values(r)[0]).join(', '));
                
                // Verify data in users table
                connection.query('SELECT COUNT(*) as count FROM users', (err, results) => {
                    if (err) {
                        console.error('Failed to count users:', err.message);
                        connection.end();
                        process.exit(1);
                    } else {
                        console.log('Users in database:', results[0].count);
                        
                        // Verify data in leave_requests table
                        connection.query('SELECT COUNT(*) as count FROM leave_requests', (err, results) => {
                            if (err) {
                                console.error('Failed to count leave requests:', err.message);
                                connection.end();
                                process.exit(1);
                            } else {
                                console.log('Leave requests in database:', results[0].count);
                            }
                            connection.end();
                            
                            console.log('\n MIGRATION SUCCESSFUL');
                            process.exit(0);
                        });
                    }
                });
            }
        });
    });
});
