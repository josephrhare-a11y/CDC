// FIREBASE DO NOT DELETE
const __firebase_config = '\n{\n  "apiKey": "AIzaSyCqyCcs2R2e7AegGjvFAwG98wlamtbHvZY",\n  "authDomain": "bard-frontend.firebaseapp.com",\n  "projectId": "bard-frontend",\n  "storageBucket": "bard-frontend.firebasestorage.app",\n  "messagingSenderId": "175205271074",\n  "appId": "1:175205271074:web:2b7bd4d34d33bf38e6ec7b"\n}\n'
// FIREBASE DO NOT DELETE

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Contagion - Global Outbreak Status</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --main-red: #dc2626; /* Tailwind red-600 */
            --glow-red: #ef4444; /* Tailwind red-500 */
            --dark-bg: #111827; /* Tailwind gray-900 */
            --panel-bg: rgba(17, 24, 39, 0.8); /* Tailwind gray-900 with alpha */
        }
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--dark-bg);
            color: #f3f4f6; /* Tailwind gray-100 */
            /* Restored procedural background for stability */
            background-image: 
                radial-gradient(circle at 25% 25%, rgba(220, 38, 38, 0.05), transparent 30%),
                radial-gradient(circle at 75% 75%, rgba(220, 38, 38, 0.05), transparent 30%);
            background-attachment: fixed;
            overflow-x: hidden;
        }
        .panel {
            background-color: var(--panel-bg);
            border: 1px solid rgba(220, 38, 38, 0.2);
            border-radius: 0.5rem;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }
        .header-title {
            font-family: 'Roboto Mono', monospace;
            text-shadow: 0 0 5px var(--glow-red), 0 0 10px var(--glow-red);
            color: var(--main-red);
            letter-spacing: 0.1em;
        }
        .stat-number {
            font-family: 'Roboto Mono', monospace;
            text-shadow: 0 0 3px var(--glow-red);
        }
        .ticker-item {
            animation: slideInUp 0.5s ease-out;
        }
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        /* Custom scrollbar for a better theme fit */
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #1f2937; /* Tailwind gray-800 */
        }
        ::-webkit-scrollbar-thumb {
            background: var(--main-red);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: var(--glow-red);
        }
    </style>
</head>
<body class="min-h-screen p-2 sm:p-4 lg:p-6">

    <div class="w-full max-w-screen-2xl mx-auto">
        <!-- Header -->
        <header class="text-center mb-6">
            <h1 class="text-3xl md:text-5xl font-bold header-title">PROJECT: CONTAGION</h1>
            <p class="text-red-400 text-sm md:text-base mt-1">Global Outbreak Status Terminal</p>
        </header>

        <!-- Main Grid Layout -->
        <main class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            
            <!-- Left Panel: Country List -->
            <aside class="lg-col-span-3 panel p-4 h-[60vh] lg:h-[75vh] flex flex-col">
                <h2 class="text-lg font-bold text-red-500 border-b-2 border-red-500/30 pb-2 mb-4">GLOBAL HOTSPOTS</h2>
                <div id="country-list" class="space-y-3 overflow-y-auto pr-2 flex-grow">
                    <!-- Country data will be injected here by JavaScript -->
                </div>
            </aside>

            <!-- Center Panel: World Map Image -->
            <section class="lg:col-span-6 panel p-1 h-[50vh] lg:h-[75vh] flex flex-col items-center justify-center overflow-hidden">
                 <!-- Updated image link to the one you provided. -->
                 <img src="https://i.imgur.com/8NA5qj8.png" alt="World Outbreak Map" class="w-full h-full object-cover rounded-md">
            </section>

            <!-- Right Panel: Stats & Ticker -->
            <aside class="lg:col-span-3 panel p-4 h-[60vh] lg:h-[75vh] flex flex-col">
                <!-- Global Stats -->
                <div>
                    <h2 class="text-lg font-bold text-red-500 border-b-2 border-red-500/30 pb-2 mb-4">GLOBAL PANDEMIC STATUS</h2>
                    <div class="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <p class="text-sm text-gray-400">TOTAL INFECTED</p>
                            <p id="total-infected" class="text-2xl lg:text-3xl font-bold text-red-400 stat-number">0</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-400">TOTAL DEATHS</p>
                            <p id="total-deaths" class="text-2xl lg:text-3xl font-bold text-red-400 stat-number">0</p>
                        </div>
                    </div>
                </div>
                
                <!-- Live Ticker -->
                <div class="mt-6 flex-grow flex flex-col overflow-hidden">
                    <h2 class="text-lg font-bold text-red-500 border-b-2 border-red-500/30 pb-2 mb-4 flex-shrink-0">LIVE OUTBREAK FEED</h2>
                    <div id="ticker-feed" class="space-y-3 overflow-y-hidden flex-grow flex flex-col-reverse">
                        <!-- Ticker messages will be injected here -->
                    </div>
                </div>
            </aside>

        </main>
    </div>

    <script>
        // --- DATA SIMULATION ---
        let countryData = [
            { name: "United States", flag: "🇺🇸", infected: 115239481, deaths: 1250119, trend: [3, 5, 4, 6, 8, 7, 9, 10] },
            { name: "India", flag: "🇮🇳", infected: 58451023, deaths: 640320, trend: [6, 7, 9, 8, 10, 12, 11, 14] },
            { name: "France", flag: "🇫🇷", infected: 45109887, deaths: 185234, trend: [5, 4, 6, 5, 7, 6, 8, 7] },
            { name: "Germany", flag: "🇩🇪", infected: 42330192, deaths: 180988, trend: [4, 5, 4, 5, 6, 5, 6, 7] },
            { name: "Brazil", flag: "🇧🇷", infected: 40876554, deaths: 755001, trend: [7, 9, 8, 11, 10, 13, 12, 15] },
            { name: "Japan", flag: "🇯🇵", infected: 38765921, deaths: 89543, trend: [3, 4, 5, 4, 6, 5, 7, 6] },
            { name: "South Korea", flag: "🇰🇷", infected: 35661045, deaths: 41032, trend: [2, 3, 4, 3, 5, 4, 6, 5] },
            { name: "Italy", flag: "🇮🇹", infected: 28998432, deaths: 201776, trend: [6, 5, 7, 6, 8, 7, 9, 8] },
            { name: "United Kingdom", flag: "🇬🇧", infected: 26781220, deaths: 254321, trend: [8, 7, 6, 7, 5, 6, 4, 5] },
            { name: "Russia", flag: "🇷🇺", infected: 25102341, deaths: 423876, trend: [5, 6, 5, 6, 7, 6, 7, 8] }
        ];

        const tickerMessages = [
            { type: 'HOTSPOT', text: 'Uncontrolled spread in Buenos Aires metro. Quarantine measures failed.' },
            { type: 'MUTATION', text: 'Strain C-7 ("Cerberus") now dominant in Western Europe. Increased resistance reported.' },
            { type: 'VACCINE', text: 'Phase II trials for V-2 vaccine suspended due to severe adverse effects.' },
            { type: 'BORDER', text: 'Canada seals southern border with the United States indefinitely.' },
            { type: 'SUPPLY', text: 'Global shipping routes at 15% capacity. Food shortages reported.' },
            { type: 'EMERGENCY', text: 'United Kingdom has declared a state of emergency in London.' },
            { type: 'BLACKOUT', text: 'Communication blackout reported across Sub-Saharan Africa.' },
            { type: 'EVACUATION', text: 'Coastal cities in Southeast Asia begin mandatory evacuations.' },
            { type: 'RESEARCH', text: 'Genetic sequencing suggests airborne prions in new viral strain.' },
        ];
        
        // --- DOM ELEMENTS ---
        const countryListEl = document.getElementById('country-list');
        const totalInfectedEl = document.getElementById('total-infected');
        const totalDeathsEl = document.getElementById('total-deaths');
        const tickerFeedEl = document.getElementById('ticker-feed');

        // --- RENDER FUNCTIONS ---

        function formatNumber(num) {
            return num.toLocaleString('en-US');
        }

        function createSparkline(data) {
            const width = 80;
            const height = 20;
            const max = Math.max(...data);
            const min = Math.min(...data);
            const points = data.map((d, i) => {
                const x = (i / (data.length - 1)) * width;
                const y = height - ((d - min) / (max - min) * height);
                return `${x},${y}`;
            }).join(' ');

            return `
                <svg viewBox="0 0 ${width} ${height}" class="w-20 h-5" preserveAspectRatio="none">
                    <polyline points="${points}" fill="none" stroke="#ef4444" stroke-width="2"/>
                </svg>
            `;
        }

        function renderCountryList() {
            countryData.sort((a, b) => b.infected - a.infected);
            countryListEl.innerHTML = countryData.map(country => `
                <div class="bg-gray-800/50 p-2 rounded-md grid grid-cols-12 gap-2 items-center">
                    <div class="col-span-1 text-lg">${country.flag}</div>
                    <div class="col-span-5">
                        <p class="font-semibold text-sm truncate">${country.name}</p>
                        <p class="text-xs text-gray-400">Infected: <span class="text-red-400 font-medium">${formatNumber(country.infected)}</span></p>
                        <p class="text-xs text-gray-400">Deaths: <span class="text-gray-300">${formatNumber(country.deaths)}</span></p>
                    </div>
                    <div class="col-span-6 flex justify-end items-center">
                        ${createSparkline(country.trend)}
                    </div>
                </div>
            `).join('');
        }

        function addTickerMessage() {
            const message = tickerMessages[Math.floor(Math.random() * tickerMessages.length)];
            const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            
            const typeColors = {
                'HOTSPOT': 'text-red-500',
                'MUTATION': 'text-yellow-400',
                'VACCINE': 'text-blue-400',
                'BORDER': 'text-orange-400',
                'DEFAULT': 'text-gray-300'
            };
            const colorClass = typeColors[message.type] || typeColors['DEFAULT'];

            const tickerItem = document.createElement('div');
            tickerItem.className = 'ticker-item bg-gray-800/50 p-2 rounded-md text-sm';
            tickerItem.innerHTML = `
                <p class="font-mono text-xs text-gray-400">${timestamp} UTC</p>
                <p><span class="font-bold ${colorClass}">${message.type}:</span> ${message.text}</p>
            `;

            if (tickerFeedEl.children.length >= 10) {
                tickerFeedEl.removeChild(tickerFeedEl.lastChild);
            }
            tickerFeedEl.insertBefore(tickerItem, tickerFeedEl.firstChild);
        }

        // --- UPDATE & SIMULATION LOGIC ---

        let globalInfected = countryData.reduce((sum, c) => sum + c.infected, 0);
        let globalDeaths = countryData.reduce((sum, c) => sum + c.deaths, 0);

        function updateGlobalCounters() {
            const infectedIncrease = Math.floor(Math.random() * 5000) + 1000;
            const deathsIncrease = Math.floor(Math.random() * 100) + 20;

            globalInfected += infectedIncrease;
            globalDeaths += deathsIncrease;

            totalInfectedEl.textContent = formatNumber(globalInfected);
            totalDeathsEl.textContent = formatNumber(globalDeaths);
        }

        function simulateDataChanges() {
            countryData.forEach(country => {
                const newInfections = Math.floor(country.infected * (Math.random() * 0.0005 + 0.0001));
                const newDeaths = Math.floor(newInfections * (Math.random() * 0.015 + 0.01));
                country.infected += newInfections;
                country.deaths += newDeaths;

                // Update trend data
                country.trend.shift();
                const lastValue = country.trend[country.trend.length - 1];
                const newValue = lastValue + (Math.random() * 4 - 1.8);
                country.trend.push(Math.max(0, newValue));
            });
            renderCountryList();
        }

        // --- INITIALIZATION ---
        
        // Initial render
        renderCountryList();
        addTickerMessage();

        // Set intervals for live updates
        setInterval(updateGlobalCounters, 1000); // Update global counts every second
        setInterval(simulateDataChanges, 3000); // Update country data every 3 seconds
        setInterval(addTickerMessage, 5000); // Add a new ticker message every 5 seconds
    </script>
</body>
</html>
