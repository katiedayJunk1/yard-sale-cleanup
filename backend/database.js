const { Pool } = require('pg');

class Database {
    constructor() {
        this.pool = null;
        this.connected = false;
    }

    async connect() {
        try {
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                // Or use individual variables:
                // host: process.env.DB_HOST,
                // port: process.env.DB_PORT,
                // database: process.env.DB_NAME,
                // user: process.env.DB_USER,
                // password: process.env.DB_PASSWORD,
            });

            // Test connection
            const client = await this.pool.connect();
            console.log('✅ PostgreSQL connected');
            client.release();
            this.connected = true;
        } catch (error) {
            console.error('❌ Database connection error:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.pool) {
                await this.pool.end();
                console.log('Database connection closed');
                this.connected = false;
            }
        } catch (error) {
            console.error('Database disconnection error:', error);
        }
    }

    isConnected() {
        return this.connected;
    }

    getPool() {
        return this.pool;
    }

    async query(text, params) {
        if (!this.connected) {
            throw new Error('Database not connected');
        }
        return this.pool.query(text, params);
    }
}

module.exports = new Database();