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
app.use('/cards', express.static(path.join(__dirname, 'cards'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.png') || path.endsWith('.webp')) {
            res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 Tage Cache (30 * 24 * 60 * 60)
        }
    }
}));

app.use(express.static(path.join(__dirname))); // Macht background.png verfügbar

// Karten nach Generationen geordnet mit Seltenheiten
// Seltenheiten: 1 = Common, 2 = Uncommon, 3 = Rare, 4 = Epic, 5 = Legendary
const generations = [
    [ // Generation 1
        { name: "Vampirschwein", rarity: 1 },
        { name: "Astronautenschwein", rarity: 1 },
        { name: "Officer Schwein", rarity: 1 },
        { name: "König Schweinchen", rarity: 1 },
        { name: "Truckerschwein", rarity: 1 },
        { name: "Doktor Schwein", rarity: 1 },
        { name: "Captain Schweinchen", rarity: 2 },
        { name: "Magierschwein", rarity: 2 },
        { name: "Boss Schwein", rarity: 3 },
        { name: "Feuerwehr Schwein", rarity: 3 },
        { name: "Alien Schwein", rarity: 4 },
        { name: "Zukunft Schwein", rarity: 5 }
    ],
    [ // Generation 2
        { name: "Bauer Schweinchen", rarity: 1 },
        { name: "Spukschweinchen", rarity: 1 },
        { name: "Pflanzenschwein", rarity: 1 },
        { name: "Zombieschwein", rarity: 1 },
        { name: "Sir Schweinchen", rarity: 1 },
        { name: "Detektiv Schnüffelschwein", rarity: 1 },
        { name: "Ninja Schwein", rarity: 2 },
        { name: "Schweinaldo", rarity: 2 },
        { name: "Agent Oink", rarity: 3 },
        { name: "Wrestlingschwein", rarity: 3 },
        { name: "Schnorchelschwein", rarity: 4 },
        { name: "Streamschwein", rarity: 5 }
    ],
    [ // Generation 3
        { name: "Sergeant Grunzer", rarity: 1 },
        { name: "Chefkoch Baconelli", rarity: 1 },
        { name: "Engelschwein", rarity: 1 },
        { name: "Teufelsschwein", rarity: 1 },
        { name: "Gärtnerschwein", rarity: 1 },
        { name: "Superschwein", rarity: 1 },
        { name: "Schweinicus Maximus", rarity: 2 },
        { name: "Drachenschwein", rarity: 2 },
        { name: "Bacon Rockham", rarity: 3 },
        { name: "Oinktron 3000", rarity: 3 },
        { name: "Mutantenschwein", rarity: 4 },
        { name: "Schweinhorn", rarity: 5 }
    ]
];
const totalGenerations = generations.length;

// Seltenheits-zu-Gewichtung-Mapping
const rarityWeights = {
    1: 40,  // Common: sehr häufig
    2: 30,  // Uncommon: häufig
    3: 15,  // Rare: selten
    4: 10,  // Epic: sehr selten
    5: 5    // Legendary: extrem selten
};

// Farben für die Seltenheiten
const rarityColors = {
    1: "#A0A0A0", // Common: Grau
    2: "#209020", // Uncommon: Grün
    3: "#2050FF", // Rare: Blau
    4: "#A020F0", // Epic: Lila
    5: "#FFA500"  // Legendary: Orange/Gold
};

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
            `SELECT card_name, COUNT(*) AS count, MIN(obtained_date) AS first_obtained 
            FROM user_cards 
            WHERE username = $1 OR LOWER(username) = LOWER($1) 
            GROUP BY card_name`
        , [username]);

        const ownedCards = new Map(result.rows.map(row => [row.card_name, { count: row.count, date: formatDate(row.first_obtained) }]));

        // Erstelle ein Mapping von Kartennamen zu Seltenheiten
        const cardRarities = new Map();
        generations.forEach(gen => {
            gen.forEach(card => {
                cardRarities.set(card.name, card.rarity);
            });
        });

        // Alle Generationen durchlaufen und HTML für jede Generation erstellen
        const generationHtml = generations.map((genCards, genIndex) => {
            const genNumber = genIndex + 1;
            const startCardNumber = genIndex * 12 + 1; // Berechne die Startnummer für diese Generation
            
            // Erstelle HTML für jede Karte in dieser Generation
            const cardsHtml = genCards.map((card, cardIndex) => {
                const cardName = card.name;
                const rarity = card.rarity;
                const rarityColor = rarityColors[rarity];
                
                const cardNumber = String(startCardNumber + cardIndex).padStart(2, '0');
                const isOwned = ownedCards.has(cardName);
                const imgSrc = isOwned ? `/cards/${cardNumber}.png` : `/cards/${cardNumber}_blurred.png`;

                const countText = isOwned ? `${ownedCards.get(cardName).count}x ` : "";
                const dateText = isOwned ? `<br>${ownedCards.get(cardName).date}` : "";
                const displayText = isOwned ? `${countText}${cardName} ${cardIndex + 1}/${genCards.length}${dateText}` : `??? ${cardIndex + 1}/${genCards.length}`;

                // Füge einen farbigen Rand basierend auf der Seltenheit hinzu
                const borderStyle = `border: 2px solid ${rarityColor};`;

                return `<div class='card-container' onclick='enlargeCard(this)'>
                            <img data-src='${imgSrc}' class='card-img lazyload' loading="lazy">
                            <p style="${borderStyle}">${displayText}</p>
                        </div>`;
            }).join('');

            // Gib HTML für diese Generation mit verstecktem Display für alle außer der ersten zurück
            return `<div id="gen-${genNumber}" class="album-grid" style="display: ${genIndex === 0 ? 'grid' : 'none'}">${cardsHtml}</div>`;
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

        /* Seltenheits-Legende */
        .rarity-legend {
            margin: 20px auto;  /* Von margin-top zu margin geändert */
            margin-bottom: 40px; /* Mehr Abstand nach unten hinzugefügt */
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
            position: relative; /* Position hinzugefügt */
            z-index: 5; /* Z-Index hinzugefügt, damit sie über dem Hintergrund liegt */
        }

        .rarity-item {
            display: flex;
            align-items: center;
            background-color: rgba(255, 255, 255, 0.8);
            padding: 5px 10px;
            border-radius: 5px;
        }

        .rarity-color {
            width: 15px;
            height: 15px;
            margin-right: 5px;
            border-radius: 3px;
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
    
    <!-- Seltenheits-Legende -->
    <div class="rarity-legend">
        <div class="rarity-item">
            <div class="rarity-color" style="background-color: #A0A0A0;"></div>
            <span>Common</span>
        </div>
        <div class="rarity-item">
            <div class="rarity-color" style="background-color: #209020;"></div>
            <span>Uncommon</span>
        </div>
        <div class="rarity-item">
            <div class="rarity-color" style="background-color: #2050FF;"></div>
            <span>Rare</span>
        </div>
        <div class="rarity-item">
            <div class="rarity-color" style="background-color: #A020F0;"></div>
            <span>Epic</span>
        </div>
        <div class="rarity-item">
            <div class="rarity-color" style="background-color: #FFA500;"></div>
            <span>Legendary</span>
        </div>
    </div>
    
    <!-- Generierte Karten für jede Generation werden hier eingefügt -->
    ${generationHtml}

    <!-- Generationen Navigation -->
    <div class="generation-controls">
        <button class="gen-button" onclick="prevGen()">← Zurück</button>
        <span id="gen-text" class="gen-text">Gen. 1</span>
        <button class="gen-button" onclick="nextGen()">Nächste Seite →</button>
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
    const totalGenerations = ${totalGenerations};

    // Lazy Loading für Bilder
    function setupLazyLoading() {
        let lazyImages = document.querySelectorAll("img.lazyload");
        let observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    let img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove("lazyload");
                    observer.unobserve(img); // Bild entladen, um Leistung zu verbessern
                }
            });
        });

        lazyImages.forEach(img => observer.observe(img));
    }

    function prevGen() {
        if (currentGen > 1) {
            currentGen--;
            updateGenDisplay();
        }
    }

    function nextGen() {
        if (currentGen < totalGenerations) {
            currentGen++;
            updateGenDisplay();
        }
    }

    function updateGenDisplay() {
        // Aktualisiere den Generationstext
        document.getElementById("gen-text").innerText = "Gen. " + currentGen;
        
        // Verstecke alle Generationen und zeige nur die aktuelle
        for (let i = 1; i <= totalGenerations; i++) {
            const genElement = document.getElementById("gen-" + i);
            if (genElement) {
                const isCurrentGen = i === currentGen;
                genElement.style.display = isCurrentGen ? 'grid' : 'none';
                
                // Falls neue Generation geladen wird, Lazy Loading aktivieren
                if (isCurrentGen) {
                    const images = genElement.querySelectorAll('.card-img.lazyload');
                    images.forEach(img => {
                        if (img.getAttribute('data-src')) {
                            img.src = img.getAttribute('data-src');
                            img.classList.remove("lazyload");
                        }
                    });
                }
            }
        }
    }

    function enlargeCard(card) {
        document.getElementById('overlay-img').src = card.querySelector('img').src;
        document.getElementById('overlay').style.display = 'flex';
    }

    function closeEnlarged() {
        document.getElementById('overlay').style.display = 'none';
    }

    // Lazy Loading beim Laden der Seite aktivieren
    document.addEventListener('DOMContentLoaded', () => {
        setupLazyLoading();
    });
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

    // Erstelle eine flache Liste aller Karten mit ihren Seltenheiten
    const allCards = generations.flat();
    
    // Berechne Gewichtungen basierend auf Seltenheit
    const probabilities = allCards.map(card => ({ 
        card: card.name, 
        weight: rarityWeights[card.rarity] || 15 
    }));

    const totalWeight = probabilities.reduce((sum, item) => sum + item.weight, 0);
    let threshold = Math.random() * totalWeight;
    let selectedCard = probabilities.find(item => (threshold -= item.weight) <= 0)?.card || probabilities[0].card;

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
