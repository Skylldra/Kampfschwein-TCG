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

// Kartenpools für mehrere Generationen mit individuellen Wahrscheinlichkeiten
const generations = {
    1: [
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
    ],
    2: [
        { card: "Ninja Schwein", weight: 14 },
        { card: "Piratenschwein", weight: 14 },
        { card: "Schwarzer Ritter", weight: 14 },
        { card: "Zauberschwein", weight: 14 },
        { card: "Cyber-Schwein", weight: 14 },
        { card: "Schweinsoldat", weight: 14 },
        { card: "Samurai-Schwein", weight: 14 },
        { card: "Geisterschwein", weight: 14 },
        { card: "Drachen-Schwein", weight: 14 },
        { card: "Spion-Schwein", weight: 14 },
        { card: "Wikinger-Schwein", weight: 14 },
        { card: "Clown-Schwein", weight: 6 } // Seltener
    ],
    3: [
        { card: "Roboter-Schwein", weight: 12 },
        { card: "Frosch-Schwein", weight: 12 },
        { card: "Schnee-Schwein", weight: 12 },
        { card: "Musiker-Schwein", weight: 12 },
        { card: "Gärtner-Schwein", weight: 12 },
        { card: "Polarforscher", weight: 12 },
        { card: "Dschungel-Schwein", weight: 12 },
        { card: "Weltraum-Schwein", weight: 12 },
        { card: "Pharao-Schwein", weight: 12 },
        { card: "Unterwasser-Schwein", weight: 12 },
        { card: "Luftschiff-Schwein", weight: 12 },
        { card: "Mutanten-Schwein", weight: 8 } // Sehr selten
    ]
};

// Gesamtzahl der Generationen
const totalGenerations = Object.keys(generations).length;

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

        res.send(`<!DOCTYPE html>
        <html lang='de'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Schweinchen-Sammelalbum von ${username}</title>
            <script>
                const generations = ${JSON.stringify(generations)};
                let currentGen = 1;
                
                function updateCards() {
                    const container = document.getElementById("cards-container");
                    container.innerHTML = "";
                    generations[currentGen].forEach((cardObj, index) => {
                        const cardNumber = String(index + 1).padStart(2, '0');
                        const isOwned = ${JSON.stringify(Array.from(ownedCards.keys()))}.includes(cardObj.card);
                        const imgExt = isOwned ? 'png' : 'jpg';
                        const imgSrc = isOwned ? \`/cards/\${cardNumber}.png\` : \`/cards/\${cardNumber}_blurred.\${imgExt}\`;

                        const countText = isOwned ? ${JSON.stringify(ownedCards)}[cardObj.card]?.count + "x " : "";
                        const dateText = isOwned ? "<br>" + ${JSON.stringify(ownedCards)}[cardObj.card]?.date : "";
                        const displayText = isOwned ? countText + cardObj.card + " " + cardNumber + "/12" + dateText : "??? " + cardNumber + "/12";

                        container.innerHTML += \`
                            <div class='card-container' onclick='enlargeCard(this)'>
                                <img src='\${imgSrc}' class='card-img'>
                                <p>\${displayText}</p>
                            </div>\`;
                    });
                    document.getElementById("gen-text").innerText = "Gen. " + currentGen;
                }

                function prevGen() {
                    if (currentGen > 1) {
                        currentGen--;
                        updateCards();
                    }
                }

                function nextGen() {
                    if (currentGen < ${totalGenerations}) {
                        currentGen++;
                        updateCards();
                    }
                }

                window.onload = updateCards;
            </script>
        </head>
        <body>
            <h1 class='album-title'>Schweinchen-Sammelalbum von ${username}</h1>
            <div id="cards-container" class='album-grid'></div>

            <div class="generation-controls">
                <button class="gen-button" onclick="prevGen()">← Zurück</button>
                <span id="gen-text">Gen. 1</span>
                <button class="gen-button" onclick="nextGen()">Vor →</button>
            </div>
        </body>
        </html>`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Abrufen der Karten");
    }
});

// Route zum Ziehen einer zufälligen Karte mit Gewichtung
app.get('/random/:username', async (req, res) => {
    const username = req.params.username;
    if (!username) return res.status(400).send("Fehlender Benutzername");

    const probabilities = Object.values(generations).flat();
    const totalWeight = probabilities.reduce((sum, item) => sum + item.weight, 0);
    let threshold = Math.random() * totalWeight;
    let selectedCard = probabilities.find(item => (threshold -= item.weight) <= 0)?.card;

    if (!selectedCard) selectedCard = probabilities[0].card;

    const date = new Date().toISOString().split('T')[0];

    try {
        await pool.query("INSERT INTO user_cards (username, card_name, obtained_date) VALUES ($1, $2, $3)", [username, selectedCard, date]);
        res.send(`${selectedCard}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Fehler beim Speichern der Karte");
    }
});

app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
