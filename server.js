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
            background: rgba(255, 255, 255, 0.60);
            z-index: -1;
        }
        
        /* Twitch-Player bleibt immer links und passt sich dynamisch an */
.twitch-wrapper {
    position: fixed;
    left: 20px; /* Abstand zum linken Rand */
    top: 50%;
    transform: translateY(-50%);
    max-width: 30vw; /* Maximal 30% der Bildschirmbreite */
    max-height: 50vh; /* Maximal 50% der Bildschirmhöhe */
    width: 500px; /* Standardbreite für große Bildschirme */
    height: 300px; /* Standardhöhe für große Bildschirme */
    min-width: 300px; /* Mindestgröße, damit es nicht zu klein wird */
    min-height: 200px; /* Mindestgröße für Lesbarkeit */
    border-radius: 10px;
    border: 3px solid #6016FF;
    overflow: hidden;
    z-index: 10;
}

/* Das Iframe des Twitch-Players soll sich vollständig anpassen */
.twitch-wrapper iframe {
    width: 100%;
    height: 100%;
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

        .card-img { 
            width: 150px; 
            height: 200px; 
            transition: transform 0.2s ease-in-out; 
        }
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

    <!-- Twitch Livestream Container (noch größer, besser sichtbar) -->
    <div class="twitch-wrapper">
        <iframe 
            src="https://player.twitch.tv/?channel=kampfschwein90&parent=kampfschwein-tcg.onrender.com" 
            frameborder="0" 
            allowfullscreen="true" 
            scrolling="no">
        </iframe>
    </div>

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

app.get('/random/:username', async (req, res) => {
    const username = req.params.username;
    if (!username) return res.status(400).send("Fehlender Benutzername");

    // Karten mit individuellen Wahrscheinlichkeiten
    const probabilities = [
        { card: "Vampirschwein", weight: 15 },
        { card: "Astronautenschwein", weight: 15 },
        { card: "Officer Schwein", weight: 15 },
        { card: "König Schweinchen", weight: 15 },
        { card: "Truckerschwein", weight: 15 },
        { card: "Doktor Schwein", weight: 15 },
        { card: "Captain Schweinchen", weight: 15 },
        { card: "Magierschwein", weight: 15 },
        { card: "Boss Schwein", weight: 15 },
        { card: "Feuerwehr Schwein", weight: 15 },
        { card: "Alien Schwein", weight: 15 },
        { card: "Zukunft Schwein", weight: 5 } // Seltene Karte
    ];

    // 1️⃣ Gesamtgewicht berechnen (Summe aller Wahrscheinlichkeiten)
    const totalWeight = probabilities.reduce((sum, item) => sum + item.weight, 0);

    // 2️⃣ Gewichtete Auswahl treffen
    let threshold = Math.random() * totalWeight; // Zufallszahl innerhalb des Gesamtgewichts
    let selectedCard = null;

    for (let item of probabilities) {
        threshold -= item.weight;
        if (threshold <= 0) {
            selectedCard = item.card;
            break;
        }
    }

    // 3️⃣ Sicherstellen, dass eine Karte gewählt wurde
    if (!selectedCard) selectedCard = probabilities[0].card;

    const cardNumber = String(cards.indexOf(selectedCard) + 1).padStart(2, '0');
    const date = new Date().toISOString().split('T')[0];

    try {
        await pool.query(
            "INSERT INTO user_cards (username, card_name, obtained_date) VALUES ($1, $2, $3)",
            [username, selectedCard, date]
        );
        res.send(`${selectedCard} ${cardNumber}/${totalCards}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Speichern der Karte");
    }
});

app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
