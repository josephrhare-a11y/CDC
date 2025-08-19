// FIREBASE DO NOT DELETE
const __firebase_config = '\n{\n  "apiKey": "AIzaSyCqyCcs2R2e7AegGjvFAwG98wlamtbHvZY",\n  "authDomain": "bard-frontend.firebaseapp.com",\n  "projectId": "bard-frontend",\n  "storageBucket": "bard-frontend.firebasestorage.app",\n  "messagingSenderId": "175205271074",\n  "appId": "1:175205271074:web:2b7bd4d34d33bf38e6ec7b"\n}\n'
// FIREBASE DO NOT DELETE

import React, { useState, useEffect, useMemo } from 'react';

// --- Helper Components ---

// SparklineGraph: A small component to render the trend graph for each country.
const SparklineGraph = ({ data }) => {
    const width = 80;
    const height = 20;
    const max = Math.max(...data);
    const min = Math.min(...data);
    
    // Create the SVG path points from the data array
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        // Handle division by zero if all data points are the same
        const yRange = max - min === 0 ? height / 2 : height - ((d - min) / (max - min) * height);
        const y = yRange;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-20 h-5" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke="#ef4444" strokeWidth="2"/>
        </svg>
    );
};

// --- Main App Component ---

export default function App() {
    // --- Initial Data ---
    const initialCountryData = useMemo(() => [
        { name: "United States", flag: "🇺🇸", infected: 115239481, deaths: 1250119, trend: [3, 5, 4, 6, 8, 7, 9, 10] },
        { name: "India", flag: "🇮🇳", infected: 58451023, deaths: 640320, trend: [6, 7, 9, 8, 10, 12, 11, 14] },
        { name: "France", flag: "🇫🇷", infected: 45109887, deaths: 185234, trend: [5, 4, 6, 5, 7, 6, 8, 7] },
        { name: "Germany", flag: "🇩🇪", infected: 42330192, deaths: 180988, trend: [4, 5, 4, 5, 6, 5, 6, 7] },
        { name: "Brazil", flag: "🇧🇷", infected: 40876554, deaths: 755001, trend: [7, 9, 8, 11, 10, 13, 12, 15] },
        { name: "Japan", flag: "🇯🇵", infected: 38765921, deaths: 89543, trend: [3, 4, 5, 4, 6, 5, 7, 6] },
        { name: "South Korea", flag: "🇰🇷", infected: 35661045, deaths: 41032, trend: [2, 3, 4, 3, 5, 4, 6, 5] },
        { name: "Italy", flag: "🇮�", infected: 28998432, deaths: 201776, trend: [6, 5, 7, 6, 8, 7, 9, 8] },
        { name: "United Kingdom", flag: "🇬🇧", infected: 26781220, deaths: 254321, trend: [8, 7, 6, 7, 5, 6, 4, 5] },
        { name: "Russia", flag: "🇷🇺", infected: 25102341, deaths: 423876, trend: [5, 6, 5, 6, 7, 6, 7, 8] }
    ], []);

    const tickerMessagesPool = useMemo(() => [
        { type: 'HOTSPOT', text: 'Uncontrolled spread in Buenos Aires metro. Quarantine measures failed.' },
        { type: 'MUTATION', text: 'Strain C-7 ("Cerberus") now dominant in Western Europe. Increased resistance reported.' },
        { type: 'VACCINE', text: 'Phase II trials for V-2 vaccine suspended due to severe adverse effects.' },
        { type: 'BORDER', text: 'Canada seals southern border with the United States indefinitely.' },
        { type: 'SUPPLY', text: 'Global shipping routes at 15% capacity. Food shortages reported.' },
        { type: 'EMERGENCY', text: 'United Kingdom has declared a state of emergency in London.' },
        { type: 'BLACKOUT', text: 'Communication blackout reported across Sub-Saharan Africa.' },
    ], []);

    // --- State Management using React Hooks ---
    const [countryData, setCountryData] = useState(initialCountryData);
    const [tickerFeed, setTickerFeed] = useState([]);
    const [globalInfected, setGlobalInfected] = useState(() => initialCountryData.reduce((sum, c) => sum + c.infected, 0));
    const [globalDeaths, setGlobalDeaths] = useState(() => initialCountryData.reduce((sum, c) => sum + c.deaths, 0));
    
    // --- Utility Functions ---
    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

    // --- Effects for Live Data Simulation ---
    useEffect(() => {
        // Interval to update global counters every second
        const counterInterval = setInterval(() => {
            setGlobalInfected(prev => prev + Math.floor(Math.random() * 5000) + 1000);
            setGlobalDeaths(prev => prev + Math.floor(Math.random() * 100) + 20);
        }, 1000);

        // Interval to update country-specific data every 3 seconds
        const countryDataInterval = setInterval(() => {
            setCountryData(prevData => {
                const newData = prevData.map(country => {
                    const newInfections = Math.floor(country.infected * (Math.random() * 0.0005 + 0.0001));
                    const newDeaths = Math.floor(newInfections * (Math.random() * 0.015 + 0.01));
                    
                    const newTrend = [...country.trend];
                    newTrend.shift();
                    const lastValue = newTrend[newTrend.length - 1];
                    const newValue = Math.max(0, lastValue + (Math.random() * 4 - 1.8));
                    newTrend.push(newValue);

                    return {
                        ...country,
                        infected: country.infected + newInfections,
                        deaths: country.deaths + newDeaths,
                        trend: newTrend
                    };
                });
                // Sort by most infected
                return newData.sort((a, b) => b.infected - a.infected);
            });
        }, 3000);

        // Interval to add a new ticker message every 5 seconds
        const tickerInterval = setInterval(() => {
            const message = tickerMessagesPool[Math.floor(Math.random() * tickerMessagesPool.length)];
            const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            
            setTickerFeed(prevFeed => [{ ...message, timestamp }, ...prevFeed.slice(0, 9)]);
        }, 5000);

        // Cleanup function to clear intervals when the component unmounts
        return () => {
            clearInterval(counterInterval);
            clearInterval(countryDataInterval);
            clearInterval(tickerInterval);
        };
    }, [initialCountryData, tickerMessagesPool]); // Dependencies for the effect

    const getTickerTypeColor = (type) => {
        switch (type) {
            case 'HOTSPOT': return 'text-red-500';
            case 'MUTATION': return 'text-yellow-400';
            case 'VACCINE': return 'text-blue-400';
            case 'BORDER': return 'text-orange-400';
            default: return 'text-gray-300';
        }
    };
    
    // --- JSX for Rendering the UI ---
    return (
        <div className="bg-[#111827] text-gray-100 min-h-screen p-2 sm:p-4 lg:p-6 font-sans bg-[radial-gradient(circle_at_25%_25%,_rgba(220,38,38,0.05),_transparent_30%),radial-gradient(circle_at_75%_75%,_rgba(220,38,38,0.05),_transparent_30%)]">
            <div className="w-full max-w-screen-2xl mx-auto">
                <header className="text-center mb-6">
                    <h1 className="text-3xl md:text-5xl font-bold text-[#dc2626] font-mono tracking-wider" style={{ textShadow: '0 0 5px #ef4444, 0 0 10px #ef4444' }}>PROJECT: CONTAGION</h1>
                    <p className="text-red-400 text-sm md:text-base mt-1">Global Outbreak Status Terminal</p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                    {/* Left Panel: Country List */}
                    <aside className="lg:col-span-3 bg-[rgba(17,24,39,0.8)] border border-[rgba(220,38,38,0.2)] rounded-lg p-4 h-[60vh] lg:h-[75vh] flex flex-col backdrop-blur-md">
                        <h2 className="text-lg font-bold text-red-500 border-b-2 border-red-500/30 pb-2 mb-4">GLOBAL HOTSPOTS</h2>
                        <div className="space-y-3 overflow-y-auto pr-2 flex-grow">
                            {countryData.map(country => (
                                <div key={country.name} className="bg-gray-800/50 p-2 rounded-md grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-1 text-lg">{country.flag}</div>
                                    <div className="col-span-5">
                                        <p className="font-semibold text-sm truncate">{country.name}</p>
                                        <p className="text-xs text-gray-400">Infected: <span className="text-red-400 font-medium">{formatNumber(country.infected)}</span></p>
                                        <p className="text-xs text-gray-400">Deaths: <span className="text-gray-300">{formatNumber(country.deaths)}</span></p>
                                    </div>
                                    <div className="col-span-6 flex justify-end items-center">
                                        <SparklineGraph data={country.trend} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* Center Panel: World Map Image */}
                    <section className="lg:col-span-6 bg-[rgba(17,24,39,0.8)] border border-[rgba(220,38,38,0.2)] rounded-lg p-1 h-[50vh] lg:h-[75vh] flex flex-col items-center justify-center overflow-hidden backdrop-blur-md">
                        <img src="https://imgur.com/a/qca0lg1" alt="World Outbreak Map" className="w-full h-full object-cover rounded-md" />
                    </section>

                    {/* Right Panel: Stats & Ticker */}
                    <aside className="lg:col-span-3 bg-[rgba(17,24,39,0.8)] border border-[rgba(220,38,38,0.2)] rounded-lg p-4 h-[60vh] lg:h-[75vh] flex flex-col backdrop-blur-md">
                        <div>
                            <h2 className="text-lg font-bold text-red-500 border-b-2 border-red-500/30 pb-2 mb-4">GLOBAL PANDEMIC STATUS</h2>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-sm text-gray-400">TOTAL INFECTED</p>
                                    <p className="text-2xl lg:text-3xl font-bold text-red-400 font-mono" style={{ textShadow: '0 0 3px #ef4444' }}>{formatNumber(globalInfected)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">TOTAL DEATHS</p>
                                    <p className="text-2xl lg:text-3xl font-bold text-red-400 font-mono" style={{ textShadow: '0 0 3px #ef4444' }}>{formatNumber(globalDeaths)}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex-grow flex flex-col overflow-hidden">
                            <h2 className="text-lg font-bold text-red-500 border-b-2 border-red-500/30 pb-2 mb-4 flex-shrink-0">LIVE OUTBREAK FEED</h2>
                            <div className="space-y-3 overflow-y-hidden flex-grow flex flex-col">
                                {tickerFeed.map((item, index) => (
                                    <div key={index} className="bg-gray-800/50 p-2 rounded-md text-sm animate-slideInUp">
                                        <p className="font-mono text-xs text-gray-400">{item.timestamp} UTC</p>
                                        <p><span className={`font-bold ${getTickerTypeColor(item.type)}`}>{item.type}:</span> {item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </main>
            </div>
        </div>
    );
}
