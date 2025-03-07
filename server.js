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

// Statische Dateien bereitstellen
app.use('/cards', express.static(path.join(__dirname, 'cards')));

// Kartenpool mit Index für Nummerierung
const cards = [
    "Officer Schwein", "Vampir Schwein", "Ritter Schwein", "Zauberer Schwein",
    "Cyber Schwein", "Ninja Schwein", "Piraten Schwein", "Alien Schwein",
    "Zombie Schwein", "Geister Schwein", "Gladiator Schwein", "Samurai Schwein"
];
const totalCards = cards.length;

// Root-Route für index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Datum in deutsches Format umwandeln
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Zufällige Karte ziehen (Funktioniert für Streamlabs & Mix It Up)
app.get(['/random/:username', '/random'], async (req, res) => {
    let username = req.params.username || req.query.username;
    if (!username || username.trim() === "") {
        return res.status(400).send("Fehlender oder ungültiger Benutzername");
    }

    // Entferne mögliche unerwartete Zeichen und setze den Namen in Kleinbuchstaben
    username = username.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().trim();

    if (username.length === 0) {
        return res.status(400).send("Ungültiger Benutzername nach Bereinigung.");
    }

    const randomIndex = Math.floor(Math.random() * totalCards);
    const card = cards[randomIndex];
    const cardNumber = String(randomIndex + 1).padStart(2, '0');
    const date = new Date().toISOString().split('T')[0];

    try {
        const result = await pool.query(
            "INSERT INTO user_cards (username, card_name, obtained_date) VALUES ($1, $2, $3) ON CONFLICT (username, card_name) DO UPDATE SET obtained_date = EXCLUDED.obtained_date RETURNING *",
            [username, card, date]
        );

        if (result.rowCount > 0) {
            res.send(`${card} ${cardNumber}/${totalCards}`);
        } else {
            res.status(500).send("Fehler: Karte wurde nicht gespeichert.");
        }
    } catch (err) {
        console.error("Fehler beim Speichern der Karte:", err);
        res.status(500).send("Fehler beim Speichern der Karte");
    }
});

app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
