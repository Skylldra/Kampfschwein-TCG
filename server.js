//Final Version 11.03.2025 Generation4
/**
 * Schweinchen-Sammelalbum Server
 * 
 * Dieser Code erstellt einen Express.js-Server, der ein digitales Sammelkartenalbum
 * für "Schweinchen-Karten" verwaltet. Der Server ermöglicht das Anzeigen von Benutzeralben
 * und das zufällige Austeilen von Karten an Benutzer.
 */

// Import der benötigten Module
const express = require('express');     // Express.js Framework für den Server
const { Pool } = require('pg');         // PostgreSQL-Client für Datenbankzugriff
require('dotenv').config();             // Lädt Umgebungsvariablen aus .env-Datei
const path = require('path');           // Modul für Pfadoperationen

// Initialisierung der Express-App
const app = express();
const port = process.env.PORT || 3000;  // Serverport aus Umgebungsvariablen oder Standard 3000

// PostgreSQL-Datenbankverbindung einrichten
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,  // Verbindungsstring aus Umgebungsvariablen
    ssl: { rejectUnauthorized: false }           // SSL-Einstellungen für Cloud-Hosting-Umgebungen
});

// Statische Dateien für Kartenbilder bereitstellen mit Cache-Einstellungen
app.use('/cards', express.static(path.join(__dirname, 'cards'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.png') || path.endsWith('.webp')) {
            res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 Tage Cache (30 * 24 * 60 * 60)
        }
    }
}));

// Statischen Ordner für andere Dateien wie background.png bereitstellen
app.use(express.static(path.join(__dirname)));

/**
 * Kartendefinitionen nach Generationen geordnet mit Seltenheiten
 * Jede Generation enthält 12 Karten mit verschiedenen Seltenheitsstufen
 * Seltenheiten: 1 = Common, 2 = Uncommon, 3 = Rare, 4 = Epic, 5 = Legendary
 */
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
    ],
    [ // Generation 4
        { name: "Senseschwein", rarity: 1 },
        { name: "Jokerschwein", rarity: 1 },
        { name: "Pianoschwein", rarity: 1 },
        { name: "Ragnaröink", rarity: 1 },
        { name: "Lucky Pork", rarity: 1 },
        { name: "Breaking News Schwein", rarity: 1 },
        { name: "Lil Pork", rarity: 2 },
        { name: "Jasoink", rarity: 2 },
        { name: "Freddy Grunzer", rarity: 3 },
        { name: "Schraubenborsti", rarity: 3 },
        { name: "Pixie Schwein", rarity: 4 },
        { name: "Phönixschwein", rarity: 5 }
    ]
];
const totalGenerations = generations.length;  // Gesamtanzahl der Generationen für Navigationslogik

/**
 * Gewichtungen für die Seltenheitsstufen beim zufälligen Verteilen von Karten
 * Je höher der Wert, desto wahrscheinlicher ist es, dass diese Seltenheit gezogen wird
 * Diese Werte bestimmen direkt die Wahrscheinlichkeit, mit der Karten einer bestimmten Seltenheit erscheinen
 */
const rarityWeights = {
    1: 40,  // Common: sehr häufig (40% Chance)
    2: 30,  // Uncommon: häufig (30% Chance)
    3: 15,  // Rare: selten (15% Chance)
    4: 10,  // Epic: sehr selten (10% Chance)
    5: 5    // Legendary: extrem selten (5% Chance)
};

/**
 * Farbdefinitionen für die verschiedenen Seltenheitsstufen
 * Diese Farben werden für die Kartenrahmen in der Benutzeroberfläche verwendet
 * und folgen gängigen Seltenheits-Farbkonventionen aus Sammelkartenspielen
 */
const rarityColors = {
    1: "#A0A0A0", // Common: Grau
    2: "#209020", // Uncommon: Grün
    3: "#2050FF", // Rare: Blau
    4: "#A020F0", // Epic: Lila
    5: "#FFA500"  // Legendary: Orange/Gold
};

/**
 * Hilfsfunktion: Wandelt ein Datum in deutsches Format (TT.MM.JJJJ) um
 * @param {string} dateString - Das zu formatierende Datum im ISO-Format
 * @return {string} Formatiertes Datum im deutschen Format
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Route: Benutzeralbum anzeigen
 * Zeigt das Sammelalbum eines bestimmten Benutzers mit allen gesammelten und fehlenden Karten an
 * Erzeugt die gesamte HTML-Seite für die Darstellung des Albums im Browser
 */
app.get('/:username', async (req, res) => {
    const username = req.params.username;
    if (!username) return res.status(400).send("Fehlender Benutzername");

    try {
        // Abfrage aller Karten des Benutzers aus der Datenbank
        // Gruppiert nach Kartenname mit Anzahl und Datum des ersten Erhalts
        const result = await pool.query(
            `SELECT card_name, COUNT(*) AS count, MIN(obtained_date) AS first_obtained 
            FROM user_cards 
            WHERE username = $1 OR LOWER(username) = LOWER($1) 
            GROUP BY card_name`
        , [username]);

        // Erstellt eine Map mit den Karten des Benutzers für schnelleren Zugriff
        const ownedCards = new Map(result.rows.map(row => [row.card_name, { count: row.count, date: formatDate(row.first_obtained) }]));

        // Erstellt eine Map für schnellen Zugriff auf die Seltenheit einer Karte
        const cardRarities = new Map();
        generations.forEach(gen => {
            gen.forEach(card => {
                cardRarities.set(card.name, card.rarity);
            });
        });

        // Erstellt HTML für jede Generation von Karten
        const generationHtml = generations.map((genCards, genIndex) => {
            const genNumber = genIndex + 1;
            const startCardNumber = genIndex * 12 + 1; // Berechnet die Startnummer für diese Generation

            // Erstellt HTML für jede Karte in dieser Generation
            const cardsHtml = genCards.map((card, cardIndex) => {
                const cardName = card.name;
                const rarity = card.rarity;
                const rarityColor = rarityColors[rarity];

                // Kartendetails berechnen
                const cardNumber = String(startCardNumber + cardIndex).padStart(2, '0');
                const isOwned = ownedCards.has(cardName);
                const imgSrc = isOwned ? `/cards/${cardNumber}.png` : `/cards/${cardNumber}_blurred.png`;

                // Anzeigetext vorbereiten (unterschiedlich für gesammelte und nicht gesammelte Karten)
                const countText = isOwned ? `${ownedCards.get(cardName).count}x ` : "";
                const dateText = isOwned ? `<br>${ownedCards.get(cardName).date}` : "";
                const displayText = isOwned ? `${countText}${cardName} ${cardIndex + 1}/${genCards.length}${dateText}` : `??? ${cardIndex + 1}/${genCards.length}`;

                // Farbigen Rahmen basierend auf der Seltenheit hinzufügen
                const borderStyle = `border: 2px solid ${rarityColor};`;

                // HTML für eine einzelne Karte erstellen
                return `<div class='card-container' onclick='enlargeCard(this)'>
                            <img data-src='${imgSrc}' class='card-img lazyload' loading="lazy">
                            <p style="${borderStyle}">${displayText}</p>
                        </div>`;
            }).join('');

            // HTML für diese Generation mit verstecktem Display für alle außer der ersten zurückgeben
            return `<div id="gen-${genNumber}" class="album-grid" style="display: ${genIndex === 0 ? 'grid' : 'none'}">${cardsHtml}</div>`;
        }).join('');

        // Die gesamte HTML-Seite für das Benutzeralbum erstellen und senden
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
            z-index: 1000; /* Höherer z-index als alle anderen Elemente, um sicherzustellen, dass das Overlay immer im Vordergrund ist */
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
            transition: background 0.3s ease-in-out, opacity 0.3s ease, transform 0.3s ease;
            width: fit-content;
            white-space: nowrap;
            transform: scale(1);
        }

        .dev-box:hover {
            background: #6016FF;
        }

        /* Für mobile Geräte: DevBox verstecken beim Scrollen */
        @media (max-width: 800px) {
            .dev-box.hidden {
                opacity: 0;
                pointer-events: none;
            }
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
            margin: 20px auto;
            margin-bottom: 40px;
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
            position: relative;
            z-index: 5; /* Wichtig: Niedriger als der z-index des Overlays (1000) */
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
            id="twitchEmbed"
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
    let isLive = false;
    let clipsQueue = [];
    let currentClipIndex = 0;

    /**
     * Überprüft den Live-Status des Streamers und lädt Clips, wenn er offline ist
     * Diese Funktion wird beim Laden der Seite und in regelmäßigen Intervallen aufgerufen
     */
    async function checkStreamStatus() {
        try {
            // Überprüfen, ob der Streamer live ist
            const response = await fetch("https://api.twitch.tv/helix/streams?user_login=kampfschwein90", {
                headers: {
                    'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',  // Öffentlicher Client-ID des Twitch Embedded Players
                    'Accept': 'application/vnd.twitchtv.v5+json'
                }
            });
            
            const data = await response.json();
            isLive = data.data && data.data.length > 0;
            
            // Wenn der Streamer offline ist und wir noch keine Clips haben, lade Clips
            if (!isLive && clipsQueue.length === 0) {
                await loadClips();
                playNextClip();
            } else if (isLive) {
                // Wenn der Streamer live ist, gehe zum Live-Stream zurück
                switchToLiveStream();
            }
        } catch (error) {
            console.error('Fehler beim Überprüfen des Stream-Status:', error);
            // Bei Fehler: Versuche Clips zu laden, da wir den Status nicht sicher bestimmen können
            if (clipsQueue.length === 0) {
                await loadClips();
                playNextClip();
            }
        }
    }

    /**
     * Lädt eine Liste von Clips des Streamers
     * Verwendet die Twitch API, um populäre Clips zu erhalten
     */
    async function loadClips() {
        try {
            // Zeitraum für Clips: Letzte 60 Tage
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 60);
            const endDate = new Date();
            
            // Zeitstempel im ISO-Format für die API
            const startTime = startDate.toISOString();
            const endTime = endDate.toISOString();
            
            // API-Anfrage für Clips
            const response = await fetch("https://api.twitch.tv/helix/clips?broadcaster_id=kampfschwein90&first=100&started_at=" + startTime + "&ended_at=" + endTime, {
                headers: {
                    'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',  // Öffentlicher Client-ID des Twitch Embedded Players
                    'Accept': 'application/vnd.twitchtv.v5+json'
                }
            });
            
            const data = await response.json();
            
            // Wenn keine Clips gefunden wurden, versuche es mit einem längeren Zeitraum
            if (!data.data || data.data.length === 0) {
                // Erweitere auf 1 Jahr
                startDate.setDate(startDate.getDate() - 305);  // ~1 Jahr insgesamt
                const newStartTime = startDate.toISOString();
                
                const retryResponse = await fetch("https://api.twitch.tv/helix/clips?broadcaster_id=kampfschwein90&first=100&started_at=" + newStartTime + "&ended_at=" + endTime, {
                    headers: {
                        'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
                        'Accept': 'application/vnd.twitchtv.v5+json'
                    }
                });
                
                const retryData = await retryResponse.json();
                clipsQueue = retryData.data || [];
            } else {
                clipsQueue = data.data;
            }
            
            // Mische die Clips in zufälliger Reihenfolge
            shuffleArray(clipsQueue);
            
            // Falls immer noch keine Clips gefunden wurden, nutze die Backup-Methode
            if (clipsQueue.length === 0) {
                await loadClipsBackupMethod();
            }
        } catch (error) {
            console.error('Fehler beim Laden der Clips:', error);
            // Bei Fehler: Verwende die Backup-Methode
            await loadClipsBackupMethod();
        }
    }

    /**
     * Backup-Methode zum Laden von Clips
     * Verwendet den Twitch API-Endpoint für Top-Clips, falls die reguläre Methode fehlschlägt
     */
    async function loadClipsBackupMethod() {
        try {
            // Verwende den Endpoint für Top-Clips
            const response = await fetch("https://api.twitch.tv/helix/clips?broadcaster_id=kampfschwein90", {
                headers: {
                    'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
                    'Accept': 'application/vnd.twitchtv.v5+json'
                }
            });
            
            const data = await response.json();
            clipsQueue = data.data || [];
            
            // Mische die Clips in zufälliger Reihenfolge
            shuffleArray(clipsQueue);
            
            // Wenn immer noch keine Clips gefunden wurden, verwende die direkte Clips-URL-Methode
            if (clipsQueue.length === 0) {
                await fetchClipsFromTwitchPage();
            }
        } catch (error) {
            console.error('Fehler bei der Backup-Methode zum Laden von Clips:', error);
            await fetchClipsFromTwitchPage();
        }
    }

    /**
     * Alternative Methode: Extrahiere Clip-IDs direkt von der Twitch-Kanal-Seite
     * Diese Methode wird verwendet, wenn die API-Methoden fehlschlagen
     */
    async function fetchClipsFromTwitchPage() {
        try {
            // Erstelle eine Liste hart codierter Fallback-Clip-Slugs
            // Diese werden nur verwendet, wenn alle API-Methoden fehlschlagen
            const fallbackClipSlugs = [
                'GleamingSpineyOxDancingBaby',
                'CrispyFrozenWatermelonArgieB8',
                'TemperedFrozenSrirachaOSsloth'
            ];
            
            clipsQueue = fallbackClipSlugs.map(slug => ({
                id: slug,
                slug: slug
            }));
        } catch (error) {
            console.error('Fehler beim Laden von Clips von der Twitch-Seite:', error);
            // Wenn alle Methoden fehlschlagen, verwenden wir einen leeren Array
            clipsQueue = [];
        }
    }

    /**
     * Hilfsfunktion zum zufälligen Mischen eines Arrays (Fisher-Yates-Algorithmus)
     * @param {Array} array - Das zu mischende Array
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    /**
     * Wechselt zum Live-Stream zurück
     */
    function switchToLiveStream() {
        const twitchEmbed = document.getElementById('twitchEmbed');
        const parentDomain = window.location.hostname;
        twitchEmbed.src = "https://player.twitch.tv/?channel=kampfschwein90&parent=" + parentDomain;
    }
    
    /**
     * Spielt den nächsten Clip in der Warteschlange ab
     */
    function playNextClip() {
        if (isLive) {
            // Wenn der Stream wieder live ist, nicht zum nächsten Clip wechseln
            switchToLiveStream();
            return;
        }
        
        if (clipsQueue.length === 0) {
            // Wenn keine Clips vorhanden sind, lade sie erneut
            loadClips().then(() => {
                playNextClip();
            });
            return;
        }
        
        // Nächsten Clip aus der Warteschlange holen
        if (currentClipIndex >= clipsQueue.length) {
            // Wenn wir am Ende der Warteschlange sind, von vorne beginnen
            currentClipIndex = 0;
            // Optional: Die Clips neu mischen für mehr Abwechslung
            shuffleArray(clipsQueue);
        }
        
        const currentClip = clipsQueue[currentClipIndex];
        currentClipIndex++;
        
        // Twitch Player auf Clip-Modus umstellen
        const twitchEmbed = document.getElementById('twitchEmbed');
        const parentDomain = window.location.hostname;
        
        if (currentClip && (currentClip.id || currentClip.slug)) {
            // Erstelle die Clip-URL basierend auf Slug oder ID
            const clipId = currentClip.slug || currentClip.id;
            twitchEmbed.src = "https://clips.twitch.tv/embed?clip=" + clipId + "&parent=" + parentDomain + "&autoplay=true";
            
            // Event-Listener für das Ende des Clips
            // Da es kein natives Event für Clip-Ende gibt, verwenden wir eine Zeitschätzung
            const clipDuration = currentClip.duration || 30; // Standarddauer 30 Sekunden falls nicht angegeben
            setTimeout(() => {
                // Nach Ablauf der geschätzten Clip-Dauer zum nächsten Clip wechseln
                playNextClip();
            }, (clipDuration + 2) * 1000); // +2 Sekunden Puffer
        } else {
            // Wenn kein gültiger Clip verfügbar ist, erneut Clips laden
            loadClips().then(() => {
                playNextClip();
            });
        }
