const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL-Datenbankverbindung
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Statische Dateien bereitstellen
app.use(express.static('public'));

// Kartenpool
const cards = [
    "Officer Schwein", "Vampir Schwein", "Ritter Schwein", "Zauberer Schwein",
    "Cyber Schwein", "Ninja Schwein", "Piraten Schwein", "Alien Schwein",
    "Zombie Schwein", "Geister Schwein", "Gladiator Schwein", "Samurai Schwein"
];

// Zufällige Karte ziehen
app.get('/draw', async (req, res) => {
    const username = req.query.user;
    if (!username) return res.status(400).send("Fehlender Benutzername");

    const card = cards[Math.floor(Math.random() * cards.length)];
    const date = new Date().toISOString().split('T')[0];

    try {
        await pool.query(
            "INSERT INTO user_cards (username, card_name, obtained_date) VALUES ($1, $2, $3)",
            [username, card, date]
        );
        res.send(`${username} hat die Karte '${card}' gezogen!`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Speichern der Karte");
    }
});

// Album abrufen
app.get('/album', async (req, res) => {
    const username = req.query.user;
    if (!username) return res.status(400).send("Fehlender Benutzername");

    try {
        const result = await pool.query("SELECT card_name FROM user_cards WHERE username = $1", [username]);
        const userCards = result.rows.map(row => row.card_name);
        res.json(userCards);
    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Abrufen der Karten");
    }
});

app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
