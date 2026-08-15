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
    } : undefined
};

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
    const sqlFile = path.join(__dirname, 'leave_db_aiven.sql');
    
    if (!fs.existsSync(sqlFile)) {
        console.error('❌ SQL file not found:', sqlFile);
        connection.end();
        process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('📄 Reading SQL file:', sqlFile);
    
    // Split SQL into individual statements - improved parsing
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    console.log('🔢 Executing', statements.length, 'SQL statements...');
    
    if (statements.length === 0) {
        console.error('❌ No SQL statements found in file');
        console.error('File content preview:', sql.substring(0, 200));
        connection.end();
        process.exit(1);
    }
    
    let completed = 0;
    let errors = 0;
    
    // Execute statements sequentially
    function executeNext(index) {
        if (index >= statements.length) {
            // All statements completed
            console.log('\n🎉 Migration complete!');
            console.log('✅ Successful statements:', completed - errors);
            console.log('❌ Failed statements:', errors);
            
            // Verify tables were created
            connection.query('SHOW TABLES', (err, results) => {
                if (err) {
                    console.error('❌ Failed to verify tables:', err.message);
                } else {
                    console.log('📋 Final tables:', results.map(r => Object.values(r)[0]).join(', '));
                    
                    // Verify data in users table
                    connection.query('SELECT COUNT(*) as count FROM users', (err, results) => {
                        if (err) {
                            console.error('❌ Failed to count users:', err.message);
                        } else {
                            console.log('👥 Users in database:', results[0].count);
                            
                            // Verify data in leave_requests table
                            connection.query('SELECT COUNT(*) as count FROM leave_requests', (err, results) => {
                                if (err) {
                                    console.error('❌ Failed to count leave requests:', err.message);
                                } else {
                                    console.log('📝 Leave requests in database:', results[0].count);
                                }
                                connection.end();
                                
                                if (errors === 0) {
                                    console.log('\n✅ MIGRATION SUCCESSFUL');
                                    process.exit(0);
                                } else {
                                    console.log('\n⚠️ MIGRATION COMPLETED WITH ERRORS');
                                    process.exit(1);
                                }
                            });
                        }
                    });
                }
            });
            return;
        }
        
        const statement = statements[index];
        connection.query(statement, (err) => {
            completed++;
            
            if (err) {
                // Ignore errors for IF NOT EXISTS and INSERT IGNORE
                if (!err.message.includes('already exists') && !err.message.includes('Duplicate entry')) {
                    console.error(`❌ Statement ${index + 1} failed:`, err.message);
                    errors++;
                } else {
                    console.log(`⏭️  Statement ${index + 1}: Skipped (already exists)`);
                }
            } else {
                console.log(`✅ Statement ${index + 1}: Success`);
            }
            
            // Execute next statement
            executeNext(index + 1);
        });
    }
    
    // Start executing statements
    executeNext(0);
});
