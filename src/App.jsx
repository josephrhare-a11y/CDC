// FIREBASE DO NOT DELETE
const __firebase_config = '\n{\n  "apiKey": "AIzaSyCqyCcs2R2e7AegGjvFAwG98wlamtbHvZY",\n  "authDomain": "bard-frontend.firebaseapp.com",\n  "projectId": "bard-frontend",\n  "storageBucket": "bard-frontend.firebasestorage.app",\n  "messagingSenderId": "175205271074",\n  "appId": "1:175205271074:web:2b7bd4d34d33bf38e6ec7b"\n}\n'
// FIREBASE DO NOT DELETE

import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, setLogLevel } from 'firebase/firestore';

// --- Helper Components ---

// SparklineGraph: Renders the trend graph for each country.
const SparklineGraph = ({ data }) => {
    const width = 80;
    const height = 20;
    const max = Math.max(...data);
    const min = Math.min(...data);
    
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const yRange = max - min === 0 ? height / 2 : height - ((d - min) / (max - min) * height);
        return `${x},${yRange}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-20 h-5" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke="#ef4444" strokeWidth="2"/>
        </svg>
    );
};

// --- Escape Room Puzzle App ---

const puzzles = {
    'easy-1': {
        question: "This pathogen is not truly alive, relying on a host to multiply. What is it?",
        answer: "virus",
        hint: "It's the central theme of this global crisis.",
        points: 5,
        difficulty: "Easy"
    },
    'medium-1': {
        question: "I am the process used to weaken a pathogen to create a vaccine. What am I?",
        answer: "attenuation",
        hint: "It's like 'taming' the virus so the body can learn to fight it.",
        points: 10,
        difficulty: "Medium"
    },
    'hard-1': {
        question: "I am the specific type of cell the C-7 'Cerberus' strain primarily targets in the nervous system. What am I?",
        answer: "neuron",
        hint: "These cells are responsible for transmitting nerve impulses.",
        points: 15,
        difficulty: "Hard"
    }
};

const PuzzleAppComponent = () => {
    // Firebase state
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);

    // App state
    const [currentUser, setCurrentUser] = useState(null);
    const [usernameInput, setUsernameInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    
    // Puzzle state
    const [activePuzzle, setActivePuzzle] = useState(null);
    const [puzzleAnswer, setPuzzleAnswer] = useState('');
    const [hintsUsed, setHintsUsed] = useState(0);

    // --- Firebase Initialization ---
    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                // Use environment variables provided by the platform
                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;

                if (!firebaseConfig) {
                    console.error("Firebase config not found.");
                    setLoading(false);
                    return;
                }

                const app = initializeApp(firebaseConfig);
                const firestore = getFirestore(app);
                const authInstance = getAuth(app);
                
                setDb(firestore);
                setAuth(authInstance);
                setLogLevel('debug');

                onAuthStateChanged(authInstance, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        // If no user, sign in. Use custom token if available, else anonymously.
                        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                        if (token) {
                            await signInWithCustomToken(authInstance, token);
                        } else {
                            await signInAnonymously(authInstance);
                        }
                    }
                    setLoading(false);
                });

            } catch (error) {
                console.error("Error initializing Firebase:", error);
                setLoading(false);
            }
        };
        initializeFirebase();
    }, []);

    // --- User Management Functions ---
    const formatUsername = (name) => {
        if (!name) return '';
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!usernameInput.trim() || !db) return;

        const formattedUsername = formatUsername(usernameInput);
        setLoading(true);
        setMessage('');

        try {
            const userRef = doc(db, `artifacts/${__app_id}/users/${userId}/players`, formattedUsername);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                setCurrentUser(userSnap.data());
                setMessage(`Welcome back, Agent ${formattedUsername}.`);
            } else {
                const newUser = {
                    name: formattedUsername,
                    score: 0,
                    completedPuzzles: {}
                };
                await setDoc(userRef, newUser);
                setCurrentUser(newUser);
                setMessage(`Identity confirmed. Welcome, Agent ${formattedUsername}.`);
            }
        } catch (error) {
            console.error("Error logging in:", error);
            setMessage("Error: Could not access secure database.");
        } finally {
            setLoading(false);
            setUsernameInput('');
        }
    };
    
    const handleLogout = () => {
        setCurrentUser(null);
        setActivePuzzle(null);
        setMessage('Session terminated. Secure channel closed.');
    };

    // --- Puzzle Functions ---
    const handlePuzzleSelect = (puzzleId) => {
        setActivePuzzle(puzzles[puzzleId]);
        setPuzzleAnswer('');
        setHintsUsed(0);
        setMessage('');
    };
    
    const handleHint = () => {
        setHintsUsed(prev => prev + 1);
        setMessage(`Hint Activated: Point value reduced.`);
    };

    const handlePuzzleSubmit = async (e) => {
        e.preventDefault();
        if (!puzzleAnswer.trim() || !currentUser || !activePuzzle) return;

        if (puzzleAnswer.toLowerCase() === activePuzzle.answer) {
            const pointsAwarded = Math.max(0, activePuzzle.points - hintsUsed);
            const newScore = currentUser.score + pointsAwarded;
            const puzzleId = Object.keys(puzzles).find(key => puzzles[key] === activePuzzle);

            const updatedUser = {
                ...currentUser,
                score: newScore,
                completedPuzzles: {
                    ...currentUser.completedPuzzles,
                    [puzzleId]: pointsAwarded
                }
            };
            
            try {
                const userRef = doc(db, `artifacts/${__app_id}/users/${userId}/players`, currentUser.name);
                await setDoc(userRef, updatedUser);
                setCurrentUser(updatedUser);
                setMessage(`Correct. ${pointsAwarded} points awarded. Transmission decrypted.`);
            } catch (error) {
                console.error("Error updating score:", error);
                setMessage("Error: Could not save progress to secure database.");
            }
            setActivePuzzle(null);
        } else {
            setMessage("Incorrect decryption key. Signal corrupted. Try again.");
        }
        setPuzzleAnswer('');
    };

    // --- Render Logic ---
    const renderContent = () => {
        if (loading) {
            return <div className="text-center text-yellow-400">Connecting to secure network...</div>;
        }

        if (!currentUser) {
            return (
                <form onSubmit={handleLogin} className="flex flex-col gap-4 items-center justify-center h-full">
                    <p className="text-center text-lg">Agent Identification Required</p>
                    <input 
                        type="text" 
                        placeholder="Enter Username" 
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="bg-gray-900/50 border border-red-500/30 rounded-md p-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-red-500" 
                    />
                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md w-full max-w-xs transition-colors">Login</button>
                    {message && <p className="text-yellow-400 mt-4">{message}</p>}
                </form>
            );
        }

        if (activePuzzle) {
            const puzzleId = Object.keys(puzzles).find(key => puzzles[key] === activePuzzle);
            const potentialPoints = activePuzzle.points - hintsUsed;

            return (
                <div className="flex flex-col gap-4 h-full">
                    <button onClick={() => setActivePuzzle(null)} className="text-left text-red-400 hover:text-red-200">&lt; Back to Puzzle List</button>
                    <div className="flex-grow">
                        <p className="text-lg text-yellow-400">{activePuzzle.difficulty} Puzzle ({potentialPoints} Points)</p>
                        <p className="mt-2 text-xl">{activePuzzle.question}</p>
                        {hintsUsed > 0 && <p className="mt-4 text-cyan-400">Hint: {activePuzzle.hint}</p>}
                    </div>
                     {message && <p className="text-yellow-400 text-center">{message}</p>}
                    <div className="flex gap-2">
                        <button onClick={handleHint} disabled={hintsUsed > 0} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500">Use Hint (-1 Pt)</button>
                    </div>
                    <form onSubmit={handlePuzzleSubmit} className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Enter answer..." 
                            value={puzzleAnswer}
                            onChange={(e) => setPuzzleAnswer(e.target.value)}
                            className="flex-grow bg-gray-900/50 border border-red-500/30 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500" 
                        />
                        <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Submit</button>
                    </form>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p>Agent: <span className="text-yellow-400">{currentUser.name}</span></p>
                        <p>Total Points: <span className="text-yellow-400">{currentUser.score}</span></p>
                    </div>
                    <button onClick={handleLogout} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">Log Off</button>
                </div>
                {message && <p className="text-yellow-400 text-center mb-2">{message}</p>}
                <div className="space-y-4 flex-grow">
                    {Object.entries(puzzles).map(([id, puzzle]) => {
                        const isCompleted = id in currentUser.completedPuzzles;
                        const pointsWon = currentUser.completedPuzzles[id];
                        return (
                            <button 
                                key={id} 
                                onClick={() => handlePuzzleSelect(id)} 
                                disabled={isCompleted}
                                className="w-full text-left p-4 rounded-md transition-colors bg-gray-800/50 hover:bg-gray-700/70 disabled:bg-green-900/50 disabled:cursor-not-allowed"
                            >
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-lg">{puzzle.difficulty} Puzzle</p>
                                    {isCompleted ? 
                                        <p className="text-green-400 font-bold">COMPLETED (+{pointsWon} pts)</p> :
                                        <p className="text-yellow-400">{puzzle.points} Points</p>
                                    }
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-[rgba(17,24,39,0.8)] border border-[rgba(220,38,38,0.2)] rounded-lg p-4 h-full flex flex-col backdrop-blur-md text-gray-300 font-mono">
            <h2 className="text-lg font-bold text-red-500 border-b-2 border-red-500/30 pb-2 mb-4 flex-shrink-0">ESCAPE ROOM TERMINAL</h2>
            <div className="flex-grow overflow-y-auto">
                {renderContent()}
            </div>
        </div>
    );
};

// --- Main App Component ---

export default function App() {
    // --- Initial Data ---
    const initialCountryData = useMemo(() => [
        { name: "United States", flag: "🇺🇸", infected: 115239481, deaths: 1250119, trend: [3, 5, 4, 6, 8, 7, 9, 10] },
        { name: "India", flag: "🇮🇳", infected: 58451023, deaths: 640320, trend: [6, 7, 9, 8, 10, 12, 11, 14] },
        { name: "France", flag: "🇫🇷", infected: 45109887, deaths: 185234, trend: [5, 4, 6, 5, 7, 6, 8, 7] },
    ], []);

    const tickerMessagesPool = useMemo(() => [
        { type: 'HOTSPOT', text: 'Uncontrolled spread in Buenos Aires metro.' },
        { type: 'MUTATION', text: 'Strain C-7 ("Cerberus") now dominant.' },
        { type: 'VACCINE', text: 'V-2 vaccine trials suspended.' },
        { type: 'BORDER', text: 'Canada seals southern border with the United States indefinitely.' },
        { type: 'SUPPLY', text: 'Global shipping routes at 15% capacity. Food shortages reported.' },
        { type: 'EMERGENCY', text: 'United Kingdom has declared a state of emergency in London.' },
        { type: 'BLACKOUT', text: 'Communication blackout reported across Sub-Saharan Africa.' },
        { type: 'EVACUATION', text: 'Coastal cities in Southeast Asia begin mandatory evacuations.' },
        { type: 'RESEARCH', text: 'Genetic sequencing suggests airborne prions in new viral strain.' },
        { type: 'QUARANTINE', text: 'Tokyo enters complete lockdown. All transport halted.' },
        { type: 'UNREST', text: 'Civil unrest escalates in major European capitals.' },
        { type: 'GRID_FAILURE', text: 'Power grid failures reported along the U.S. East Coast.' },
        { type: 'MARTIAL_LAW', text: 'Martial law declared in Mexico City.' },
        { type: 'WATER_SHORTAGE', text: 'Critical water shortages in North African territories.' },
        { type: 'CURE_RUMOR', text: 'Unconfirmed reports of a potential cure emerge from a remote Siberian lab.' },
        { type: 'SATELLITE', text: 'Key communications satellite goes offline over the Pacific.' },
        { type: 'TRANSPORT', text: 'All international air travel officially suspended.' },
        { type: 'ECONOMIC', text: 'Global stock markets have ceased trading indefinitely.' },
        { type: 'REFUGEE_CRISIS', text: 'Mass refugee movements creating new hotspots in central Asia.' },
        { type: 'CYBER_ATTACK', text: 'Cyber attack cripples hospital networks in South America.' },
        { type: 'NAVY_BLOCKADE', text: 'Naval blockades established in the Mediterranean Sea.' },
        { type: 'GENETIC_DRIFT', text: 'Virus shows signs of rapid genetic drift, complicating vaccine research.' },
        { type: 'ZONE_COLLAPSE', text: 'Quarantine zone in Sydney has collapsed. Containment failed.' },
        { type: 'GOV_SILENCE', text: 'Official government broadcasts have ceased in multiple countries.' },
        { type: 'HOPE', text: 'Underground labs report a minor breakthrough in antiviral synthesis.' },
        { type: 'DESPERATION', text: 'Unaffected territories begin closing borders to all refugees.' },
        { type: 'NATURE', text: 'Wildlife seen reclaiming abandoned urban centers.' },
        { type: 'TRANSMISSION', text: 'New evidence suggests waterborne transmission is possible.' },
    ], []);

    // --- State Management ---
    const [countryData, setCountryData] = useState(initialCountryData);
    const [tickerFeed, setTickerFeed] = useState([]);
    const [globalInfected, setGlobalInfected] = useState(4381278912);
    const [globalDeaths, setGlobalDeaths] = useState(1881278912);
    
    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

    // --- Effects for Live Data Simulation ---
    useEffect(() => {
        const counterInterval = setInterval(() => {
            setGlobalInfected(prev => prev + Math.floor(Math.random() * 10001) + 10000);
            setGlobalDeaths(prev => prev + Math.floor(Math.random() * 4001) + 1000);
        }, 1000);

        const countryDataInterval = setInterval(() => {
            setCountryData(prevData => {
                const newData = prevData.map(country => {
                    const newInfections = Math.floor(country.infected * (Math.random() * 0.0005 + 0.0001));
                    const newTrend = [...country.trend];
                    newTrend.shift();
                    newTrend.push(Math.max(0, newTrend[newTrend.length - 1] + (Math.random() * 4 - 1.8)));
                    return { ...country, infected: country.infected + newInfections, deaths: country.deaths + Math.floor(newInfections * 0.015), trend: newTrend };
                });
                return newData.sort((a, b) => b.infected - a.infected);
            });
        }, 3000);

        const tickerInterval = setInterval(() => {
            setTickerFeed(prevFeed => {
                const lastMessageText = prevFeed[0]?.text;
                let newMessage;
                do {
                    newMessage = tickerMessagesPool[Math.floor(Math.random() * tickerMessagesPool.length)];
                } while (newMessage.text === lastMessageText && tickerMessagesPool.length > 1);
                
                const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                return [{ ...newMessage, timestamp }, ...prevFeed.slice(0, 9)];
            });
        }, 5000);

        return () => {
            clearInterval(counterInterval);
            clearInterval(countryDataInterval);
            clearInterval(tickerInterval);
        };
    }, [initialCountryData, tickerMessagesPool]);

    const getTickerTypeColor = (type) => {
        const colors = {
            'HOTSPOT': 'text-red-500', 
            'MUTATION': 'text-yellow-400', 
            'VACCINE': 'text-blue-400',
            'BORDER': 'text-orange-400',
            'SUPPLY': 'text-amber-400',
            'EMERGENCY': 'text-rose-500',
            'BLACKOUT': 'text-indigo-400',
            'EVACUATION': 'text-teal-400',
            'RESEARCH': 'text-cyan-400',
            'QUARANTINE': 'text-lime-400',
            'UNREST': 'text-red-400',
            'GRID_FAILURE': 'text-yellow-500',
            'MARTIAL_LAW': 'text-rose-600',
            'WATER_SHORTAGE': 'text-blue-500',
            'CURE_RUMOR': 'text-green-400',
            'SATELLITE': 'text-indigo-500',
            'TRANSPORT': 'text-gray-400',
            'ECONOMIC': 'text-amber-500',
            'REFUGEE_CRISIS': 'text-orange-500',
            'CYBER_ATTACK': 'text-fuchsia-500',
            'NAVY_BLOCKADE': 'text-blue-600',
            'GENETIC_DRIFT': 'text-purple-500',
            'ZONE_COLLAPSE': 'text-red-600',
            'GOV_SILENCE': 'text-gray-500',
            'HOPE': 'text-green-500',
            'DESPERATION': 'text-rose-700',
            'NATURE': 'text-emerald-500',
            'TRANSMISSION': 'text-sky-500',
        };
        return colors[type] || 'text-gray-300';
    };
    
    return (
        <div className="text-gray-100 min-h-screen p-2 sm:p-4 lg:p-6 font-sans bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('https://i.imgur.com/8NA5qj8.png')" }}>
            <div className="w-full max-w-screen-2xl mx-auto">
                <header className="text-center mb-6 bg-black/50 backdrop-blur-sm p-4 rounded-lg">
                    <h1 className="text-3xl md:text-5xl font-bold text-[#dc2626] font-mono tracking-wider" style={{ textShadow: '0 0 5px #ef4444, 0 0 10px #ef4444' }}>PROJECT: CONTAGION</h1>
                    <p className="text-red-400 text-sm md:text-base mt-1">Global Outbreak Status Terminal</p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
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

                    <section className="lg:col-span-6 h-[60vh] lg:h-[75vh]">
                        <PuzzleAppComponent />
                    </section>

                    <aside className="lg:col-span-3 bg-[rgba(17,24,39,0.8)] border border-[rgba(220,38,38,0.2)] rounded-lg p-4 h-[60vh] lg:h-[75vh] flex flex-col backdrop-blur-md">
                        <div>
                            <h2 className="text-lg font-bold text-red-500 border-b-2 border-red-500/30 pb-2 mb-4">GLOBAL PANDEMIC STATUS</h2>
                            <div className="flex flex-col items-center text-center">
                                <div className="mb-2">
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
                                    <div key={index} className="bg-gray-800/50 p-2 rounded-md text-sm">
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
