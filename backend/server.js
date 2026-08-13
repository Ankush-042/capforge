require('dotenv').config();
const express = require('express');
const authRoutes = require('./auth/authRoutes');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CapForge backend listening on port ${PORT}`));

module.exports = app;
