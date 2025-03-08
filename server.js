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
app.use(express.static(path.join(__dirname))); // Macht background.png verfügbar

// Kartenpool mit Index für Nummerierung
const cards = [
    "Vampirschwein", "Astronautenschwein", "Officer Schwein", "König Schweinchen",
    "Truckerschwein", "Doktor Schwein", "Captain Schweinchen", "Magierschwein",
    "Boss Schwein", "Feuerwehr Schwein", "Alien Schwein", "Zukunft Schwein"
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
        const result = await pool.query("SELECT card_name, obtained_date FROM user_cards WHERE username = $1 OR LOWER(username) = LOWER($1);", [username]);
        const ownedCards = new Map(result.rows.map(row => [row.card_name, formatDate(row.obtained_date)]));

        const albumHtml = cards.map((card, index) => {
            const cardNumber = String(index + 1).padStart(2, '0');
            const isOwned = ownedCards.has(card);
            const imgExt = isOwned ? 'png' : 'jpg';
            const imgSrc = isOwned ? `/cards/${cardNumber}.png` : `/cards/${cardNumber}_blurred.${imgExt}`;
            const displayText = isOwned ? `${card} ${cardNumber}/${totalCards}<br>${ownedCards.get(card)}` : `??? ${cardNumber}/${totalCards}`;
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
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    background: url('/background.png') no-repeat center center fixed; 
                    background-size: cover;
                }
                body::after {
                    content: "";
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.60); /* 60% Transparenz */
                    z-index: -1;
                }

                .album-title { 
                    font-size: 2.5em; 
                    margin-bottom: 20px; 
                    color: white; 
                    text-shadow: 0 0 5px #6016FF, 0 0 10px #6016FF, 0 0 20px #6016FF; 
                }
                .album-grid { 
                    display: grid; 
                    grid-template-columns: repeat(3, 1fr); 
                    gap: 20px; 
                    justify-content: center; 
                    max-width: 900px; 
                    margin: auto; 
                }
                .card-container { 
    text-align: center; 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
}

.card-container p { 
    background: white; 
    border: 2px solid #6016FF;
    padding: 5px;
    margin-top: 5px;
    width: fit-content;
    font-weight: bold;
    text-align: center;
    display: flex;
    flex-direction: column;
}

                .card-img { width: 150px; height: 200px; transition: transform 0.2s ease-in-out; }
                .card-img:hover { transform: scale(1.1); }
                #overlay { 
                    position: fixed; 
                    top: 0; 
                    left: 0; 
                    width: 100%; 
                    height: 100%; 
                    background: rgba(0, 0, 0, 0.8); 
                    display: none; 
                    align-items: center; 
                    justify-content: center; 
                }
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

// Zufällige Karte ziehen
app.get('/random/:username', async (req, res) => {
    const username = req.params.username;
    if (!username) return res.status(400).send("Fehlender Benutzername");

    const randomIndex = Math.floor(Math.random() * totalCards);
    const card = cards[randomIndex];
    const cardNumber = String(randomIndex + 1).padStart(2, '0');
    const date = new Date().toISOString().split('T')[0];

    try {
        await pool.query(
            "INSERT INTO user_cards (username, card_name, obtained_date) VALUES ($1, $2, $3)",
            [username, card, date]
        );
        res.send(`${card} ${cardNumber}/${totalCards}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Speichern der Karte");
    }
});

app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
