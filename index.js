require('dotenv').config({ path: './index.env' });

const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// Пул соединений
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.get('/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 AS status');
        res.json({ status: 'ok', db: 'connected' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

app.get('/students', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, full_name, group_id FROM students');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

app.get('/students/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
        if (!rows.length) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch student' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

