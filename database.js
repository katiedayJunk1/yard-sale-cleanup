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
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

    /**
     * Create required tables (safe to run repeatedly).
     */
    async initSchema() {
        await this.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

        await this.query(`
            CREATE TABLE IF NOT EXISTS deal_week (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                week_start date UNIQUE NOT NULL,
                min_required integer NOT NULL,
                max_allowed integer NOT NULL,
                status text NOT NULL DEFAULT 'OPEN',
                triggered_at timestamptz,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now()
            );
        `);

        await this.query(`
            CREATE TABLE IF NOT EXISTS signup (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                deal_week_id uuid NOT NULL REFERENCES deal_week(id) ON DELETE CASCADE,
                first_name text NOT NULL,
                last_name text NOT NULL,
                email text NOT NULL,
                phone text NOT NULL,
                street_address text NOT NULL,
                city text NOT NULL,
                state text,
                zip text NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                status text NOT NULL DEFAULT 'ACTIVE',
                canceled_at timestamptz,
                manage_token text NOT NULL UNIQUE
            );
        `);

        await this.query('CREATE INDEX IF NOT EXISTS idx_signup_week_status ON signup(deal_week_id, status);');
        await this.query('CREATE INDEX IF NOT EXISTS idx_signup_email ON signup(email);');

        await this.query(`
            CREATE TABLE IF NOT EXISTS email_log (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                deal_week_id uuid NOT NULL REFERENCES deal_week(id) ON DELETE CASCADE,
                signup_id uuid REFERENCES signup(id) ON DELETE CASCADE,
                email_type text NOT NULL,
                sent_at timestamptz NOT NULL DEFAULT now(),
                UNIQUE (deal_week_id, signup_id, email_type)
            );
        `);
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