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
        const result = await pool.query(`
            SELECT card_name, COUNT(*) AS count, MIN(obtained_date) AS first_obtained 
            FROM user_cards 
            WHERE username = $1 OR LOWER(username) = LOWER($1) 
            GROUP BY card_name
        `, [username]);

        const ownedCards = new Map(result.rows.map(row => [row.card_name, { count: row.count, date: formatDate(row.first_obtained) }]));

        const albumHtml = cards.map((card, index) => {
            const cardNumber = String(index + 1).padStart(2, '0');
            const isOwned = ownedCards.has(card);
            const imgExt = isOwned ? 'png' : 'jpg';
            const imgSrc = isOwned ? `/cards/${cardNumber}.png` : `/cards/${cardNumber}_blurred.${imgExt}`;

            const countText = isOwned ? `${ownedCards.get(card).count}x ` : "";
            const dateText = isOwned ? `<br>${ownedCards.get(card).date}` : "";
            const displayText = isOwned ? `${countText}${card} ${cardNumber}/${totalCards}${dateText}` : `??? ${cardNumber}/${totalCards}`;

            return `<div class='card-container' onclick='enlargeImage(this)'>
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
            background: rgba(255, 255, 255, 0.60);
            z-index: -1;
        }

        /* Twitch-Player & Streamplan */
        .twitch-wrapper, .streamplan-wrapper {
            position: fixed;
            top: 50%;
            transform: translateY(-50%);
            width: max(20vw, 400px);
            height: calc(max(20vw, 400px) * 0.5625);
            max-width: 35vw;
            max-height: 35vh;
            border-radius: 10px;
            border: 3px solid #6016FF;
            overflow: hidden;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
            background: black;
            transition: all 0.3s ease-in-out;
        }

        .twitch-wrapper { left: 20px; }
        .streamplan-wrapper { right: 20px; }

        .twitch-wrapper iframe, .streamplan-wrapper img {
            width: 100%;
            height: 100%;
        }

        /* Streamplan klickbar */
        .streamplan-wrapper img {
            cursor: pointer;
        }

        /* Overlay für Vergrößerung */
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
            z-index: 100;
        }

        #overlay-img { max-width: 90%; max-height: 90%; }

    </style>
</head>
<body>

    <!-- Twitch Livestream links -->
    <div class="twitch-wrapper" id="twitchPlayer">
        <iframe 
            src="https://player.twitch.tv/?channel=zarbex&parent=kampfschwein-tcg.onrender.com" 
            frameborder="0" 
            allowfullscreen="true" 
            scrolling="no">
        </iframe>
    </div>

    <!-- Streamplan rechts (jetzt klickbar) -->
    <div class="streamplan-wrapper" id="streamplanImage">
        <img src="/streamplan.png" alt="Streamplan" onclick="enlargeImage(this)">
    </div>

    <h1 class='album-title'>Schweinchen-Sammelalbum von ${username}</h1>
    <div class='album-grid'>${albumHtml}</div>

    <div id='overlay' onclick='closeEnlarged()'>
        <img id='overlay-img'>
    </div>

    <script>
    function enlargeImage(element) {
        const imgSrc = element.src;
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

app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
