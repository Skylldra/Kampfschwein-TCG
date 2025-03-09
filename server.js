//Letzter Meilenstein ohe Austausch der Karten bei Generationswechsel
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

// Karten nach Generationen geordnet
const generations = [
    [ // Generation 1
        "Vampirschwein", "Astronautenschwein", "Officer Schwein", "König Schweinchen",
        "Truckerschwein", "Doktor Schwein", "Captain Schweinchen", "Magierschwein",
        "Boss Schwein", "Feuerwehr Schwein", "Alien Schwein", "Zukunft Schwein"
    ],
    [ // Generation 2
        "Cyber-Schwein", "Ninja-Schwein", "Piratenschwein", "Ritter-Schwein",
        "Detektiv-Schwein", "Dino-Schwein", "Pharao-Schwein", "Wikinger-Schwein",
        "Cowboy-Schwein", "Superheld-Schwein", "Samurai-Schwein", "Geister-Schwein"
    ],
    [ // Generation 3
        "Gamer-Schwein", "Steampunk-Schwein", "Clown-Schwein", "Roboter-Schwein",
        "Zombie-Schwein", "Teufels-Schwein", "Engel-Schwein", "Hexen-Schwein",
        "Gladiator-Schwein", "Alien-König", "Drachen-Schwein", "Neon-Schwein"
    ]
];
const totalGenerations = generations.length;

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
        const result = await pool.query(
            SELECT card_name, COUNT(*) AS count, MIN(obtained_date) AS first_obtained 
            FROM user_cards 
            WHERE username = $1 OR LOWER(username) = LOWER($1) 
            GROUP BY card_name
        , [username]);

        const ownedCards = new Map(result.rows.map(row => [row.card_name, { count: row.count, date: formatDate(row.first_obtained) }]));

        const currentGenIndex = 0; // Standardmäßig Gen 1
const cards = generations[currentGenIndex]; // Karten der aktuellen Generation

const albumHtml = cards.map((card, index) => {
    const cardNumber = String(index + 1).padStart(2, '0');
    const isOwned = ownedCards.has(card);
    const imgSrc = isOwned ? /cards/${cardNumber}.png : /cards/${cardNumber}_blurred.png;

    const countText = isOwned ? ${ownedCards.get(card).count}x  : "";
    const dateText = isOwned ? <br>${ownedCards.get(card).date} : "";
    const displayText = isOwned ? ${countText}${card} ${cardNumber}/${cards.length}${dateText} : ??? ${cardNumber}/${cards.length};

    return <div class='card-container' onclick='enlargeCard(this)'>
                <img src='${imgSrc}' class='card-img'>
                <p>${displayText}</p>
            </div>;
}).join('');

        res.send(<!DOCTYPE html>
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

        /* Automatische Ausblendung auf mobilen Geräten */
        @media (max-width: 800px) {
            .twitch-wrapper, .streamplan-wrapper {
                display: none;
            }
        }

        .album-title { 
            font-size: 2.5em; 
            margin-bottom: 20px; 
            color: white; 
            text-shadow: 0 0 5px #6016FF, 0 0 10px #6016FF, 0 0 20px #6016FF; 
        }

        /* Karten-Anordnung für PC */
        .album-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 20px; 
            justify-content: center; 
            max-width: 900px; 
            margin: auto; 
        }

        /* Karten-Anordnung für Handy (2 Karten pro Reihe) */
        @media (max-width: 800px) {
            .album-grid {
                grid-template-columns: repeat(2, 1fr);
                max-width: 600px;
            }
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

        /* Developer Box bleibt immer gleich groß */
        .dev-box {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 1.2em;
            font-weight: bold;
            cursor: pointer;
            border: 2px solid #6016FF;
            transition: background 0.3s ease-in-out;
            width: fit-content;
            white-space: nowrap;
            transform: scale(1);
        }

        .dev-box:hover {
            background: #6016FF;
        }

        /* Buttons für Generationen-Wechsel */
        .generation-controls {
            margin-top: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
        }

        .gen-button {
            padding: 10px 15px;
            font-size: 1em;
            font-weight: bold;
            background-color: #6016FF;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.2s ease-in-out;
        }

        .gen-button:hover {
            background-color: #4300A3;
        }

        .gen-text {
            font-size: 1.5em;
            font-weight: bold;
            color: white;
            text-shadow: 0 0 5px #6016FF, 0 0 10px #6016FF;
        }

    </style>
</head>
<body>

    <!-- Twitch Livestream links -->
    <div class="twitch-wrapper" id="twitchPlayer">
        <iframe 
            src="https://player.twitch.tv/?channel=kampfschwein90&parent=kampfschwein-tcg.onrender.com" 
            frameborder="0" 
            allowfullscreen="true" 
            scrolling="no">
        </iframe>
    </div>

    <!-- Streamplan rechts -->
    <div class="streamplan-wrapper" id="streamplanImage">
        <img src="/streamplan.png" alt="Streamplan">
    </div>

    <h1 class='album-title'>Schweinchen-Sammelalbum von ${username}</h1>
    
    <div class='album-grid' id="cards-container">
        ${albumHtml}
    </div>

    <!-- Generationen Navigation -->
    <div class="generation-controls">
        <button class="gen-button" onclick="prevGen()">← Zurück</button>
        <span id="gen-text" class="gen-text">Gen. 1</span>
        <button class="gen-button" onclick="nextGen()">Vor →</button>
    </div>

    <div id='overlay' onclick='closeEnlarged()'>
        <img id='overlay-img'>
    </div>

    <!-- Developer Box unten links -->
    <div class="dev-box" onclick="window.open('https://www.twitch.tv/x_MeduZa_', '_blank')">
        Developer: x_MeduZa_
    </div>

    <script>
        let currentGen = 1;
        const totalGenerations = 3;

        function prevGen() {
            if (currentGen > 1) {
                currentGen--;
                document.getElementById("gen-text").innerText = "Gen. " + currentGen;
                updateCards();
            }
        }

        function nextGen() {
            if (currentGen < totalGenerations) {
                currentGen++;
                document.getElementById("gen-text").innerText = "Gen. " + currentGen;
                updateCards();
            }
        }

        function updateCards() {
            // Hier wird später die Kartenliste dynamisch geändert
            console.log("Aktuelle Generation: " + currentGen);
        }

        function enlargeCard(card) {
            document.getElementById('overlay-img').src = card.querySelector('img').src;
            document.getElementById('overlay').style.display = 'flex';
        }

        function closeEnlarged() {
            document.getElementById('overlay').style.display = 'none';
        }
    </script>

</body>
</html>);
    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Abrufen der Karten");
    }
});

app.get('/random/:username', async (req, res) => {
    const username = req.params.username;
    if (!username) return res.status(400).send("Fehlender Benutzername");

    const allCards = generations.flat();
    const probabilities = allCards.map(card => ({ card, weight: card.includes("Zukunft") ? 5 : 15 }));

    const totalWeight = probabilities.reduce((sum, item) => sum + item.weight, 0);
    let threshold = Math.random() * totalWeight;
    let selectedCard = probabilities.find(item => (threshold -= item.weight) <= 0)?.card || probabilities[0].card;

    const date = new Date().toISOString().split('T')[0];

    try {
        await pool.query("INSERT INTO user_cards (username, card_name, obtained_date) VALUES ($1, $2, $3)", [username, selectedCard, date]);
        res.send(${selectedCard});
    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Speichern der Karte");
    }
});

app.listen(port, () => {
    console.log(Server läuft auf Port ${port});
});
