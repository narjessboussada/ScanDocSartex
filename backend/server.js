const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB, closeDB } = require('./src/config/db');
const asyncHandler = require('./src/middleware/asyncHandler');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middlewares
// ============================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Routes utilitaires
// ============================================
app.get('/', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    await pool.request().query('SELECT @@VERSION AS version, DB_NAME() AS currentDB');
    res.json({
        status: 'ok',
        message: '✅ Server is running',
        database: process.env.DB_NAME,
        server: process.env.DB_SERVER,
        timestamp: new Date().toISOString()
    });
}));

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: '✅ Healthy',
        timestamp: new Date().toISOString() 
    });
});

app.get('/tables', asyncHandler(async (req, res) => {
    const pool = await connectDB();
    const result = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
    `);
    res.json({
        status: 'ok',
        tables: result.recordset.map(t => t.TABLE_NAME)
    });
}));

// ============================================
// Routes API
// ============================================
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/scan', require('./src/routes/scan'));

// ============================================
// 404
// ============================================
app.use((req, res) => {
    res.status(404).json({ status: 'error', message: '❌ Route not found' });
});

// ============================================
// Gestion des erreurs centralisée
// ============================================
app.use(errorHandler);

// ============================================
// Démarrage du serveur
// ============================================
async function start() {
    try {
        console.log('\n⚙️  Initialisation du serveur...');
        await connectDB();

        const server = app.listen(PORT, () => {
            console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
            console.log(`📊 Base de données: ${process.env.DB_NAME}`);
            console.log(`🖥️  Serveur SQL: ${process.env.DB_SERVER}\n`);
        });

        process.on('SIGINT', async () => {
            console.log('\n⚠️  SIGINT reçu, arrêt du serveur...');
            server.close(async () => {
                await closeDB();
                console.log('✅ Serveur arrêté');
                process.exit(0);
            });
        });
    } catch (err) {
        console.error(`\n❌ Erreur au démarrage: ${err.message}`);
        process.exit(1);
    }
}

start();