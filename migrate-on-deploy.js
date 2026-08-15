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

// If running with --inspect flag, run database inspection instead
if (process.argv.includes('--inspect')) {
    console.log('🔍 Running database inspection mode...');
    inspectDatabases();
    return;
}

console.log('Starting database migration...');
console.log('Host:', config.host);
console.log('Port:', config.port);
console.log('Database:', config.database);
console.log('SSL:', config.ssl ? 'Enabled' : 'Disabled');

if (!config.host || !config.user || !config.password) {
    console.error('❌ Missing required environment variables');
    console.error('Required: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
    process.exit(1);
}

const connection = mysql.createConnection(config);

connection.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Successfully connected to database');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'leave_db.sql');
    
    if (!fs.existsSync(sqlFile)) {
        console.error('❌ SQL file not found:', sqlFile);
        connection.end();
        process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('📄 Reading SQL file:', sqlFile);
    
    // Remove USE statement since we're already connected to the database
    const cleanedSql = sql
        .replace(/CREATE DATABASE IF NOT EXISTS[^;]+;/g, '') // Remove CREATE DATABASE statements
        .replace(/USE `[^`]+`;/g, '') // Remove USE statements
        .replace(/--.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .trim();
    
    console.log('🔢 Executing SQL script as single query...');
    
    // Execute the entire SQL as a single query (MySQL supports multiple statements)
    connection.query(cleanedSql, (err) => {
        if (err) {
            // Check if it's a "table already exists" or "duplicate entry" error
            if (err.message.includes('already exists') || err.message.includes('Duplicate entry')) {
                console.log('⏭️  Migration skipped (tables/data already exist)');
            } else {
                console.error('❌ Migration failed:', err.message);
                connection.end();
                process.exit(1);
            }
        } else {
            console.log('✅ SQL script executed successfully');
        }
        
        // Verify tables were created
        connection.query('SHOW TABLES', (err, results) => {
            if (err) {
                console.error('❌ Failed to verify tables:', err.message);
                connection.end();
                process.exit(1);
            } else {
                console.log('📋 Final tables:', results.map(r => Object.values(r)[0]).join(', '));
                
                // Verify data in users table
                connection.query('SELECT COUNT(*) as count FROM users', (err, results) => {
                    if (err) {
                        console.error('❌ Failed to count users:', err.message);
                        connection.end();
                        process.exit(1);
                    } else {
                        console.log('👥 Users in database:', results[0].count);
                        
                        // Verify data in leave_requests table
                        connection.query('SELECT COUNT(*) as count FROM leave_requests', (err, results) => {
                            if (err) {
                                console.error('❌ Failed to count leave requests:', err.message);
                                connection.end();
                                process.exit(1);
                            } else {
                                console.log('📝 Leave requests in database:', results[0].count);
                            }
                            connection.end();
                            
                            console.log('\n✅ MIGRATION SUCCESSFUL');
                            process.exit(0);
                        });
                    }
                });
            }
        });
    });
}

function inspectDatabases() {
    console.log('🔍 Database Inspection Mode');
    console.log('============================');
    console.log('Host:', config.host);
    console.log('Port:', config.port);
    console.log('User:', config.user);
    console.log('SSL:', config.ssl ? 'Enabled' : 'Disabled');

    const connection = mysql.createConnection(config);

    connection.connect((err) => {
        if (err) {
            console.error('❌ Aiven connection failed:', err.message);
            process.exit(1);
        }
        
        console.log('✅ Successfully connected to Aiven MySQL');
        
        // First, show all databases
        connection.query('SHOW DATABASES', (err, results) => {
            if (err) {
                console.error('❌ Failed to show databases:', err.message);
                connection.end();
                process.exit(1);
            }
            
            console.log('\n📋 Available databases:');
            results.forEach(db => {
                console.log('  -', Object.values(db)[0]);
            });
            
            // Now inspect defaultdb
            console.log('\n🔍 Inspecting defaultdb...');
            connection.query('USE defaultdb', (err) => {
                if (err) {
                    console.error('❌ Failed to use defaultdb:', err.message);
                    console.log('ℹ️  defaultdb does not exist or is not accessible');
                    inspectLeaveDb(connection);
                } else {
                    connection.query('SHOW TABLES', (err, results) => {
                        if (err) {
                            console.error('❌ Failed to show tables in defaultdb:', err.message);
                            inspectLeaveDb(connection);
                        } else {
                            console.log('📋 Tables in defaultdb:', results.length > 0 ? results.map(r => Object.values(r)[0]).join(', ') : 'None');
                            
                            if (results.length > 0) {
                                // Get row counts for each table
                                let tablesProcessed = 0;
                                results.forEach((tableObj) => {
                                    const tableName = Object.values(tableObj)[0];
                                    connection.query(`SELECT COUNT(*) as count FROM ${tableName}`, (err, countResult) => {
                                        if (!err) {
                                            console.log(`  - ${tableName}: ${countResult[0].count} rows`);
                                        }
                                        tablesProcessed++;
                                        if (tablesProcessed === results.length) {
                                            inspectLeaveDb(connection);
                                        }
                                    });
                                });
                            } else {
                                inspectLeaveDb(connection);
                            }
                        }
                    });
                }
            });
        });
    });
}

function inspectLeaveDb(connection) {
    console.log('\n🔍 Inspecting leave_db...');
    connection.query('USE leave_db', (err) => {
        if (err) {
            console.error('❌ Failed to use leave_db:', err.message);
            console.log('ℹ️  leave_db does not exist or is not accessible');
            connection.end();
            process.exit(0);
        }
        
        connection.query('SHOW TABLES', (err, results) => {
            if (err) {
                console.error('❌ Failed to show tables in leave_db:', err.message);
                connection.end();
                process.exit(1);
            }
            
            console.log('📋 Tables in leave_db:', results.length > 0 ? results.map(r => Object.values(r)[0]).join(', ') : 'None');
            
            if (results.length > 0) {
                // Get row counts for each table
                let tablesProcessed = 0;
                results.forEach((tableObj) => {
                    const tableName = Object.values(tableObj)[0];
                    connection.query(`SELECT COUNT(*) as count FROM ${tableName}`, (err, countResult) => {
                        if (!err) {
                            console.log(`  - ${tableName}: ${countResult[0].count} rows`);
                        }
                        tablesProcessed++;
                        if (tablesProcessed === results.length) {
                            inspectTableStructures(connection, results.map(r => Object.values(r)[0]));
                        }
                    });
                });
            } else {
                connection.end();
                process.exit(0);
            }
        });
    });
}

function inspectTableStructures(connection, tables) {
    console.log('\n🔍 Inspecting table structures...');
    
    let tablesInspected = 0;
    
    tables.forEach((tableName) => {
        connection.query(`DESCRIBE ${tableName}`, (err, results) => {
            if (!err) {
                console.log(`\n📋 Structure of ${tableName}:`);
                results.forEach(column => {
                    console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key ? '(' + column.Key + ')' : ''}`);
                });
            }
            
            tablesInspected++;
            if (tablesInspected === tables.length) {
                connection.end();
                process.exit(0);
            }
        });
    });
}
