const sql = require('mssql');
require('dotenv').config();

/**
 * Configuration de la base de données SQL Server
 * @type {object}
 */
const dbConfig = {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME || 'ocrdev',
    authentication: {
        type: 'default',
        options: {
            userName: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        }
    },
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectionTimeout: 30000,
        requestTimeout: 30000
    },
    pool: {
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

/**
 * Établit une connexion au serveur SQL Server
 * @async
 * @returns {Promise<sql.ConnectionPool>} Le pool de connexions
 * @throws {Error} Si la connexion échoue
 */
async function connectDB() {
    try {
        if (pool) {
            return pool;
        }

        console.log('🔌 Connexion à SQL Server...');
        pool = await new sql.ConnectionPool(dbConfig).connect();
        console.log(`✅ Connecté à ${dbConfig.database} sur ${dbConfig.server}`);
        return pool;
    } catch (err) {
        console.error(`❌ Erreur de connexion: ${err.message}`);
        throw err;
    }
}

/**
 * Obtient le pool de connexions actif ou établit une nouvelle connexion
 * @async
 * @returns {Promise<sql.ConnectionPool>} Le pool de connexions
 */
async function getPool() {
    if (!pool) {
        await connectDB();
    }
    return pool;
}

/**
 * Ferme la connexion au serveur SQL Server
 * @async
 * @returns {Promise<void>}
 */
async function closeDB() {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('🔌 Connexion fermée');
    }
}

module.exports = { sql, connectDB, getPool, closeDB, dbConfig };