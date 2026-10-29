require('dotenv').config({ path: './index.env' });

const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
        const { group_id } = req.query; 
        
        let query = 'SELECT id, full_name, group_id FROM students';
        let params = [];

        if (group_id) {
            query += ' WHERE group_id = ?';
            params.push(group_id);
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

app.get('/students/:id', async (req, res) => {
    const id = Number(req.params.id);
    
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid ID. Must be a positive integer' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch student' });
    }
});

app.post('/students', async (req, res) => {
    const { full_name, group_id } = req.body;

    // Валидация
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
        return res.status(400).json({ error: 'full_name is required and must be a non-empty string' });
    }
    if (!group_id || !Number.isInteger(group_id) || group_id <= 0) {
        return res.status(400).json({ error: 'group_id is required and must be a positive integer' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO students (full_name, group_id) VALUES (?, ?)',
            [full_name.trim(), group_id]
        );

        const [newStudent] = await pool.query('SELECT * FROM students WHERE id = ?', [result.insertId]);
        res.status(201).json(newStudent[0]);
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ error: 'Group with this ID does not exist' });
        }
        res.status(500).json({ error: 'Failed to create student' });
    }
});



app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});