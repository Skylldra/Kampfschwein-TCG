const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL-Datenbankverbindung
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Root-Route für index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Benutzeralbum anzeigen (z. B. /x_MeduZa_ zeigt das Album von x_MeduZa_)
app.get('/:username', async (req, res) => {
    const username = req.params.username;
    if (!username) return res.status(400).send("Fehlender Benutzername");

    try {
        const result = await pool.query("SELECT card_name FROM user_cards WHERE username = $1", [username]);
        const userCards = result.rows.map(row => row.card_name);
        res.send(`<h1>Album von ${username}</h1><p>${userCards.join(', ') || 'Noch keine Karten'}</p>`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Abrufen der Karten");
    }
});

// Zufällige Karte ziehen (z. B. /random/x_MeduZa_ für x_MeduZa_)
app.get('/random/:username', async (req, res) => {
    const username = req.params.username;
    if (!username) return res.status(400).send("Fehlender Benutzername");

    const cards = [
        "Officer Schwein", "Vampir Schwein", "Ritter Schwein", "Zauberer Schwein",
        "Cyber Schwein", "Ninja Schwein", "Piraten Schwein", "Alien Schwein",
        "Zombie Schwein", "Geister Schwein", "Gladiator Schwein", "Samurai Schwein"
    ];
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

app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
