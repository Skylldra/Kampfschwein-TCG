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

// Benutzeralbum anzeigen
app.get('/:username', async (req, res) => {
    const username = req.params.username;
    if (!username) return res.status(400).send("Fehlender Benutzername");

    try {
        const result = await pool.query("SELECT card_name, obtained_date FROM user_cards WHERE username = $1", [username]);
        const ownedCards = new Map(result.rows.map(row => [row.card_name, formatDate(row.obtained_date)]));
        
        const albumHtml = cards.map((card, index) => {
            const cardNumber = String(index + 1).padStart(2, '0');
            const isOwned = ownedCards.has(card);
            const imgExt = isOwned ? 'png' : 'jpg';
            const imgSrc = isOwned ? `/cards/${cardNumber}.png` : `/cards/${cardNumber}_blurred.${imgExt}`;
            const displayText = isOwned ? `${card} ${cardNumber}/${totalCards} - ${ownedCards.get(card)}` : `??? ${cardNumber}/${totalCards}`;
            return `<div class='card-container' onclick='enlargeCard(this)'>
                        <img src='${imgSrc}' class='card-img'>
                        <p>${displayText}</p>
                    </div>`;
        }).join('');
        
        res.send(`<!DOCTYPE html>
        <html lang='de'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Schweinchen-Sammelalbum von ${username}</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background-color: #f8f8f8; }
                .album-title { font-size: 2em; margin-bottom: 20px; }
                .album-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; justify-content: center; max-width: 900px; margin: auto; }
                .card-container { text-align: center; cursor: pointer; }
                .card-img { width: 150px; height: 200px; transition: transform 0.2s ease-in-out; }
                .card-img:hover { transform: scale(1.1); }
                #overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); display: none; align-items: center; justify-content: center; }
                #overlay-img { max-width: 80%; max-height: 80%; }
            </style>
        </head>
        <body>
            <h1 class='album-title'>Schweinchen-Sammelalbum von ${username}</h1>
            <div class='album-grid'>${albumHtml}</div>
            <div id='overlay' onclick='closeEnlarged()'>
                <img id='overlay-img'>
            </div>
            <script>
                function enlargeCard(card) {
                    const imgSrc = card.querySelector('img').src;
                    document.getElementById('overlay-img').src = imgSrc;
                    document.getElementById('overlay').style.display = 'flex';
                }
                function closeEnlarged() {
                    document.getElementById('overlay').style.display = 'none';
                }
            </script>
        </body>
        </html>`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Abrufen der Karten");
    }
});

// Zufällige Karte ziehen (Funktioniert für Streamlabs & Mix It Up)
app.get(['/random/:username', '/random'], async (req, res) => {
    let username = req.params.username || req.query.username;
    if (!username || username.trim() === "") {
        return res.status(400).send("Fehlender oder ungültiger Benutzername");
    }

    username = username.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().trim();

    if (username.length === 0) {
        return res.status(400).send("Ungültiger Benutzername nach Bereinigung.");
    }

    const randomIndex = Math.floor(Math.random() * totalCards);
    const card = cards[randomIndex];
    const cardNumber = String(randomIndex + 1).padStart(2, '0');
    const date = new Date().toISOString().split('T')[0];

    try {
        await pool.query(
            "INSERT INTO user_cards (username, card_name, obtained_date) VALUES ($1, $2, $3) ON CONFLICT (username, card_name) DO UPDATE SET obtained_date = EXCLUDED.obtained_date",
            [username, card, date]
        );
        res.send(`${card} ${cardNumber}/${totalCards}`);
    } catch (err) {
        console.error("Fehler beim Speichern der Karte:", err);
        res.status(500).send("Fehler beim Speichern der Karte");
    }
});

app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
