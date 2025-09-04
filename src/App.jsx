// DONT DELETE ME WHEN COPYING
const realFirebaseConfig = {
  apiKey: "AIzaSyAomaZzvP00NJw54-WKn30VtiMbFxY7yz0",
  authDomain: "cdc-escape-room.firebaseapp.com",
  projectId: "cdc-escape-room",
  storageBucket: "cdc-escape-room.firebasestorage.app",
  messagingSenderId: "806926771572",
  appId: "1:806926771572:web:960a402ed9a632b4c3b821",
  measurementId: "G-LGFHDQ8YMK"
};

// Change this
// const getPlayersCollectionPath = (appId) => `artifacts/${appId}/public/data/players`;
// to
// const getPlayersCollectionPath = (appId) => `artifacts/${appId}/players`;

// END DONT DELETE ME

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, onSnapshot, setLogLevel } from 'firebase/firestore';

const getPlayersCollectionPath = (appId) => `artifacts/${appId}/players`;

// --- Helper Components & Functions ---

// --- Modal Component for Critical Updates ---
const UpdateModal = ({ update, onClose }) => {
    if (!update) return null;

    const getTickerTypeColor = (type) => ({ 'HOTSPOT': 'text-red-400', 'MUTATION': 'text-yellow-400', 'VACCINE': 'text-blue-400' }[type] || 'text-slate-300');

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 border border-slate-700 p-6 max-w-2xl w-full m-4"
                onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className={`font-bold ${getTickerTypeColor(update.type)}`}>{update.type}</p>
                        <h3 className="text-xl font-bold text-slate-100 mt-1">{update.text}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                </div>
                <p className="text-slate-300 mt-4 whitespace-pre-wrap">{update.details}</p>
            </div>
        </div>
    );
};

// --- Secure CDC Terminal (Formerly Escape Room App) ---

const puzzles = {
    'easy-1': { title: "Nature of the Beast", question: "This pathogen is not truly alive, relying on a host to multiply. What is it?", answer: "virus", hint: "It's the central theme of this global crisis.", points: 5, difficulty: "Easy" },
    'easy-2': { title: "Scope of the Crisis", question: "What is the term for a disease outbreak that spreads across countries and continents?", answer: "pandemic", hint: "It's more widespread than an epidemic.", points: 5, difficulty: "Easy" },
    'easy-3': { title: "First Line of Defense", question: "What common medical supply is worn over the face to prevent the spread of airborne pathogens?", answer: "mask", hint: "Often made of paper or cloth.", points: 5, difficulty: "Easy" },
    'medium-1': { title: "Taming the Enemy", question: "I am the process used to weaken a pathogen to create a vaccine. What am I?", answer: "attenuation", hint: "It's like 'taming' the virus so the body can learn to fight it.", points: 10, difficulty: "Medium" },
    'medium-2': { title: "The Silent Spreader", question: "What is the name for a carrier of a disease who shows no symptoms?", answer: "asymptomatic", hint: "The 'A' prefix means 'without'.", points: 10, difficulty: "Medium" },
    'medium-3': { title: "Field of Study", question: "What biological science is dedicated to the study of viruses?", answer: "virology", hint: "It ends with '-ology', meaning 'the study of'.", points: 10, difficulty: "Medium" },
    'hard-1': { title: "Cellular Target", question: "I am the specific type of cell the C-7 'Cerberus' strain primarily targets in the nervous system. What am I?", answer: "neuron", hint: "These cells are responsible for transmitting nerve impulses.", points: 15, difficulty: "Hard" },
    'hard-2': { title: "The Final Goal", question: "What is the term for the complete eradication of a disease from the globe?", answer: "eradication", hint: "Think 'to completely get rid of'.", points: 15, difficulty: "Hard" },
    'hard-3': { title: "The Viral Key", question: "What structure on the surface of a virus allows it to attach to host cells?", answer: "spike protein", hint: "It's a two-word answer, and the first word is a sharp point.", points: 15, difficulty: "Hard" }
};

const totalPossiblePoints = Object.values(puzzles).reduce((sum, p) => sum + p.points, 0);

const Leaderboard = ({ db, isAuthReady }) => {
    const [players, setPlayers] = useState([]);

    useEffect(() => {
        if (!db || !isAuthReady) return;
        
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const playersRef = collection(db, getPlayersCollectionPath(appId));
        
        const unsubscribe = onSnapshot(playersRef, (snapshot) => {
            const playersData = snapshot.docs.map(doc => doc.data());
            playersData.sort((a, b) => b.score - a.score);
            setPlayers(playersData);
        }, (error) => {
            console.error("Leaderboard snapshot error:", error);
        });

        return () => unsubscribe();
    }, [db, isAuthReady]);

    return (
        <div className="mt-4">
            <h3 className="text-base font-bold text-sky-400 border-b border-sky-400/30 pb-2 mb-2">Vaccine Research Leaderboard</h3>
            <div className="space-y-2">
                {players.map(player => {
                    const progress = (player.score / totalPossiblePoints) * 100;
                    return (
                        <div key={player.name} className="bg-slate-800/50 p-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold">{player.name}</span>
                            </div>
                            <div className="w-full bg-slate-700 h-2 mt-1">
                                <div className="bg-yellow-500 h-2" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-right text-xs text-slate-400">{progress.toFixed(1)}% Complete</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const QrLoginComponent = ({ onLogin }) => {
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [scanError, setScanError] = useState('');
    const scannerRef = useRef(null);

    useEffect(() => {
        if (window.Html5Qrcode) {
            setScriptLoaded(true);
            return;
        }
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode/minified/html5-qrcode.min.js";
        script.async = true;
        script.onload = () => setScriptLoaded(true);
        script.onerror = () => setScanError("Could not load QR scanner script.");
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    useEffect(() => {
        if (!scriptLoaded || !scannerRef.current) return;
        
        let html5QrCode;
        const scannerContainerId = "qr-reader-container";
        let isScanning = true;

        try {
            html5QrCode = new window.Html5Qrcode(scannerContainerId);
            const qrCodeSuccessCallback = (decodedText, decodedResult) => {
                if (isScanning) {
                    isScanning = false;
                    onLogin(decodedText);
                    if (html5QrCode && html5QrCode.isScanning) {
                       html5QrCode.stop().catch(err => console.error("Failed to stop scanner post-scan.", err));
                    }
                }
            };
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            
            html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
                .catch(err => setScanError("Could not start camera. Please grant camera permissions."));

        } catch(e) {
            setScanError("QR Scanner initialization failed.");
            console.error(e);
        }

        return () => {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(err => console.error("Failed to stop scanner on cleanup.", err));
            }
        };
    }, [scriptLoaded, onLogin]);

    return (
        <div className="w-full max-w-xs aspect-square bg-slate-800 border border-slate-600 flex items-center justify-center">
            {!scriptLoaded && !scanError && <p>Loading Scanner...</p>}
            {scanError && <p className="text-red-500 text-center p-4">{scanError}</p>}
            <div id="qr-reader-container" ref={scannerRef} style={{ width: '100%' }}></div>
        </div>
    );
};

const PuzzleAppComponent = () => {
    // Firebase state
    const [db, setDb] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // App state
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    
    // Puzzle state
    const [activePuzzle, setActivePuzzle] = useState(null);
    const [puzzleAnswer, setPuzzleAnswer] = useState('');
    const [hintsUsed, setHintsUsed] = useState(0);

    // Inactivity Timer State
    const [countdown, setCountdown] = useState(10);
    const inactivityTimerRef = useRef(null);
    const countdownIntervalRef = useRef(null);

    // --- Firebase Initialization ---
    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
                if (!firebaseConfig) { 
                    console.error("Firebase config not found. Please ensure the environment variables are set.");
                    setLoading(false); 
                    return; 
                }
                const app = initializeApp(firebaseConfig);
                const firestore = getFirestore(app);
                const authInstance = getAuth(app);
                setDb(firestore);
                setLogLevel('debug');
                
                onAuthStateChanged(authInstance, async (user) => {
                    if (!user) {
                        try {
                            const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                            if (token) { 
                                await signInWithCustomToken(authInstance, token); 
                            } else { 
                                await signInAnonymously(authInstance); 
                            }
                        } catch (authError) {
                            console.error("Firebase Auth Error:", authError);
                        }
                    }
                    setIsAuthReady(true);
                    setLoading(false);
                });
            } catch (error) {
                console.error("Error initializing Firebase:", error);
                setLoading(false);
            }
        };
        initializeFirebase();
    }, []);

    const handleLogout = () => {
        setCurrentUser(null);
        setActivePuzzle(null);
        if (document.hasFocus()) {
             setMessage('Session terminated due to inactivity.');
        }
    };
    
    // --- Inactivity Timer Logic ---
    useEffect(() => {
        const resetTimer = () => {
            clearTimeout(inactivityTimerRef.current);
            clearInterval(countdownIntervalRef.current);
            setCountdown(10);
            inactivityTimerRef.current = setTimeout(handleLogout, 10000);
            countdownIntervalRef.current = setInterval(() => {
                setCountdown(prev => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        };
        if (currentUser) {
            window.addEventListener('mousemove', resetTimer);
            window.addEventListener('keydown', resetTimer);
            resetTimer();
        }
        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            clearTimeout(inactivityTimerRef.current);
            clearInterval(countdownIntervalRef.current);
        };
    }, [currentUser]);

    const formatUsername = (name) => name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : '';
    
    const processLoginAttempt = async (username) => {
        if (!username.trim() || !db) return;
        const formattedUsername = formatUsername(username);
        setLoading(true);
        setMessage(`QR Code detected. Authenticating Agent ${formattedUsername}...`);
        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const userRef = doc(db, getPlayersCollectionPath(appId), formattedUsername);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                setCurrentUser(userSnap.data());
                setMessage(`Welcome back, Agent ${formattedUsername}.`);
            } else {
                const newUser = { name: formattedUsername, score: 0, completedPuzzles: {} };
                await setDoc(userRef, newUser);
                setCurrentUser(newUser);
                setMessage(`Identity confirmed. Welcome, Agent ${formattedUsername}.`);
            }
        } catch (error) {
            console.error("Error logging in:", error);
            setMessage("Error: Could not access secure database.");
        } finally {
            setLoading(false);
        }
    };
    
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
            const updatedUser = { ...currentUser, score: newScore, completedPuzzles: { ...currentUser.completedPuzzles, [puzzleId]: pointsAwarded }};
            try {
                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                const userRef = doc(db, getPlayersCollectionPath(appId), currentUser.name);
                await setDoc(userRef, updatedUser);
                setCurrentUser(updatedUser);
                setMessage(`Correct. ${pointsAwarded} points awarded.`);
            } catch (error) {
                console.error("Error updating score:", error);
                setMessage("Error: Could not save progress.");
            }
            setActivePuzzle(null);
        } else {
            setMessage("Incorrect. Try again.");
        }
        setPuzzleAnswer('');
    };

    const LoggedInHeader = () => (
        <div className="flex justify-between items-center mb-4 text-sm">
            <div>
                <p>Agent: <span className="text-yellow-400 font-bold">{currentUser.name}</span></p>
                <p>Score: <span className="text-yellow-400 font-bold">{currentUser.score}</span></p>
            </div>
            <div className="text-center">
                 <p className="text-xs text-slate-400">Session ends in:</p>
                 <p className="font-semibold text-lg text-slate-300">{countdown}s</p>
            </div>
            <button onClick={handleLogout} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-1 px-3 text-sm transition-colors">Log Off</button>
        </div>
    );

    const renderContent = () => {
        if (loading && !currentUser) return <div className="text-center text-sky-300">Initializing Secure Terminal...</div>;

        if (!currentUser) {
            return (
                <div className="flex flex-col h-full">
                    <div className="flex flex-col gap-4 items-center justify-center flex-shrink-0">
                        <p className="text-center text-base">Scan Agent ID</p>
                        <QrLoginComponent onLogin={processLoginAttempt} />
                        {message && <p className="text-yellow-400 mt-4 text-sm text-center">{message}</p>}
                    </div>
                    <div className="flex-grow overflow-y-auto mt-4 pr-2">
                        {isAuthReady && <Leaderboard db={db} isAuthReady={isAuthReady} />}
                    </div>
                </div>
            );
        }

        if (activePuzzle) {
            const potentialPoints = activePuzzle.points - hintsUsed;
            return (
                <div className="flex flex-col h-full">
                    <LoggedInHeader />
                    <div className="flex flex-col gap-4 h-full flex-grow">
                        <div className="flex-grow">
                            <p className="text-base text-yellow-400">{activePuzzle.difficulty} Assignment ({potentialPoints} Points)</p>
                            <p className="mt-2 text-lg">{activePuzzle.question}</p>
                            {hintsUsed > 0 && <p className="mt-4 text-cyan-400">Intel: {activePuzzle.hint}</p>}
                        </div>
                        {message && <p className="text-yellow-400 text-center text-sm">{message}</p>}
                        <form onSubmit={handlePuzzleSubmit} className="flex gap-2">
                            <input type="text" placeholder="Enter answer..." value={puzzleAnswer} onChange={(e) => setPuzzleAnswer(e.target.value)} className="flex-grow bg-slate-800 border border-slate-600 p-2 focus:outline-none focus:ring-2 focus:ring-sky-500" />
                            <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 transition-colors">Submit</button>
                        </form>
                        <div className="flex gap-2">
                            <button onClick={handleHint} disabled={hintsUsed > 0} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 transition-colors disabled:bg-slate-500 text-sm">Request Intel (-1 Pt)</button>
                            <button onClick={() => setActivePuzzle(null)} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 transition-colors text-sm">Abort Assignment</button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full">
                <LoggedInHeader />
                {message && <p className="text-yellow-400 text-center mb-2 text-sm">{message}</p>}
                <div className="space-y-2 flex-grow overflow-y-auto pr-2">
                    {['Easy', 'Medium', 'Hard'].map(difficulty => (
                        <div key={difficulty}>
                            <h3 className="text-sm font-bold text-slate-400">{difficulty} Assignments</h3>
                            {Object.entries(puzzles).filter(([_, p]) => p.difficulty === difficulty).map(([id, puzzle]) => {
                                const isCompleted = id in currentUser.completedPuzzles;
                                const pointsWon = currentUser.completedPuzzles[id];
                                return (
                                    <button key={id} onClick={() => handlePuzzleSelect(id)} disabled={isCompleted} className="w-full text-left p-3 my-1 transition-colors bg-slate-800/50 hover:bg-slate-700/70 disabled:bg-green-900/50 disabled:cursor-not-allowed">
                                        <div className="flex justify-between items-center text-sm">
                                            <span>{puzzle.title}</span>
                                            {isCompleted ? <span className="text-green-400 font-bold">COMPLETED (+{pointsWon} pts)</span> : <span className="text-yellow-400">{puzzle.points} Points</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-slate-900 border border-slate-700 p-4 h-full flex flex-col text-slate-200">
            <h2 className="text-base font-bold text-sky-400 border-b border-sky-400/30 pb-2 mb-4 flex-shrink-0">SECURE CDC TERMINAL</h2>
            <div className="flex-grow overflow-y-auto pr-2">
                {renderContent()}
            </div>
        </div>
    );
};

// --- Main App Component ---

export default function App() {
    const initialCountryData = useMemo(() => [
        { name: "United States", flag: "🇺🇸", infected: 425000000, deaths: 106250000 },
        { name: "India", flag: "🇮🇳", infected: 215000000, deaths: 53750000 },
        { name: "Brazil", flag: "🇧🇷", infected: 155000000, deaths: 38750000 },
        { name: "France", flag: "🇫🇷", infected: 150000000, deaths: 37500000 },
        { name: "Germany", flag: "🇩🇪", infected: 135000000, deaths: 33750000 },
        { name: "United Kingdom", flag: "🇬🇧", infected: 110000000, deaths: 27500000 },
        { name: "Russia", flag: "🇷🇺", infected: 90000000, deaths: 22500000 },
        { name: "South Korea", flag: "🇰🇷", infected: 90000000, deaths: 22500000 },
        { name: "Italy", flag: "🇮🇹", infected: 85000000, deaths: 21250000 },
        { name: "Japan", flag: "🇯🇵", infected: 45000000, deaths: 11250000 }
    ], []);

    const tickerMessagesPool = useMemo(() => [
        { type: 'HOTSPOT', text: 'Uncontrolled spread in Buenos Aires metro.', details: 'Reports from Buenos Aires indicate a total breakdown of quarantine measures in the metropolitan area. Local health officials report a 300% increase in cases over the last 24 hours. The Argentinian government is considering military intervention to enforce a city-wide lockdown.' }, 
        { type: 'MUTATION', text: 'Strain C-7 ("Cerberus") now dominant.', details: 'The World Health Organization has confirmed that the C-7 "Cerberus" variant is now the dominant strain across Western Europe. Its high transmissibility and resistance to early-stage antivirals are causing significant concern in the global health community.' }, 
        { type: 'VACCINE', text: 'V-2 vaccine trials suspended.', details: 'Phase II trials for the Novavax-Biolabs V-2 vaccine have been indefinitely suspended following reports of severe neurological side effects in test participants. This represents a major setback in the global effort to develop a viable vaccine.' }, 
        { type: 'BORDER', text: 'Canada seals southern border with the United States.', details: 'The Canadian government has closed its land border with the United States to all non-essential travel. Military personnel have been deployed to enforce the closure, citing the uncontrolled spread of the virus in several northern US states.' }, 
        { type: 'SUPPLY', text: 'Global shipping routes at 15% capacity.', details: 'Major shipping conglomerates report that global maritime trade is operating at only 15% of its normal capacity due to crew shortages and quarantine restrictions at major ports. Experts warn of imminent, widespread shortages of food and medical supplies.' }, 
        { type: 'EMERGENCY', text: 'United Kingdom declares state of emergency.', details: 'A national state of emergency has been declared in the United Kingdom. Prime Minister has granted emergency powers to the government to requisition property and enact strict curfews in London and Manchester to combat the outbreak.' }, 
        { type: 'BLACKOUT', text: 'Communication blackout in Sub-Saharan Africa.', details: 'Multiple satellite imagery providers have confirmed a widespread and ongoing communications blackout across most of Sub-Saharan Africa. The cause is unknown, but the inability to contact local governments and aid organizations is creating a humanitarian crisis.' }, 
        { type: 'EVACUATION', text: 'Coastal cities in Southeast Asia begin evacuations.', details: 'Governments in Vietnam, Thailand, and the Philippines have issued mandatory evacuation orders for several major coastal cities. The move is a precaution against the collapse of civil infrastructure and the potential for the virus to spread via contaminated water supplies.' }, 
        { type: 'RESEARCH', text: 'Genetic sequencing suggests new transmission vector.', details: 'A research paper published by the University of Tokyo suggests the latest viral strain may have developed the ability to remain viable in soil and freshwater sources for extended periods, opening up new potential vectors for transmission.' }
    ], []);

    const [countryData, setCountryData] = useState(initialCountryData);
    
    const createInitialFeed = () => {
        const shuffled = [...tickerMessagesPool].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 5).map(item => ({...item, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}));
    };

    const [tickerFeed, setTickerFeed] = useState(createInitialFeed);
    const [globalInfected, setGlobalInfected] = useState(4381278912);
    const [globalDeaths, setGlobalDeaths] = useState(1881278912);
    const [selectedUpdate, setSelectedUpdate] = useState(null);
    
    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

    useEffect(() => {
        const counterInterval = setInterval(() => {
            setGlobalInfected(prev => prev + Math.floor(Math.random() * 10001) + 10000);
            setGlobalDeaths(prev => prev + Math.floor(Math.random() * 4001) + 1000);
        }, 1000);

        const countryDataInterval = setInterval(() => {
            setCountryData(prevData => {
                const newData = prevData.map(c => {
                    const newInfected = c.infected + Math.floor(c.infected * (Math.random() * 0.0005 + 0.0001));
                    const newDeaths = Math.floor(newInfected * 0.25);
                    return {...c, infected: newInfected, deaths: newDeaths };
                });
                return newData.sort((a, b) => b.infected - a.infected);
            });
        }, 3000);

        const tickerInterval = setInterval(() => {
            setTickerFeed(prevFeed => {
                const lastMessageText = prevFeed[0]?.text;
                let newMessage;
                do { newMessage = tickerMessagesPool[Math.floor(Math.random() * tickerMessagesPool.length)]; } 
                while (newMessage.text === lastMessageText && tickerMessagesPool.length > 1);
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

    const getTickerTypeColor = (type) => ({ 'HOTSPOT': 'text-red-400', 'MUTATION': 'text-yellow-400', 'VACCINE': 'text-blue-400' }[type] || 'text-slate-300');
    
    return (
        <div className="text-slate-200 min-h-screen p-2 sm:p-4 font-sans bg-slate-800">
            <div className="w-full max-w-screen-2xl mx-auto">
                <header className="flex justify-between items-center mb-4 text-white">
                    <h1 className="text-2xl md:text-3xl font-bold">CORONAVIRUS RESOURCE CENTER</h1>
                     <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/US_CDC_logo.svg/2560px-US_CDC_logo.svg.png" alt="CDC Logo" className="h-8"/>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <aside className="lg:col-span-3 bg-slate-900 p-4 h-[60vh] lg:h-[80vh] flex flex-col">
                        <h2 className="text-base font-bold text-sky-400 border-b border-sky-400/30 pb-2 mb-4">Confirmed Cases by Country</h2>
                        <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
                            {countryData.map(country => (
                                <div key={country.name} className="text-sm bg-slate-800/50 p-2">
                                     <div className="flex items-center mb-2">
                                        <span className="text-lg mr-2">{country.flag}</span>
                                        <span className="font-semibold truncate">{country.name}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="text-center">
                                            <p className="text-xs text-slate-400">Infected</p>
                                            <p className="font-semibold text-red-500">{formatNumber(country.infected)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-slate-400">Deaths</p>
                                            <p className="font-semibold text-slate-200">{formatNumber(country.deaths)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>

                    <section className="lg:col-span-6 h-[60vh] lg:h-[80vh]">
                        <PuzzleAppComponent />
                    </section>

                    <aside className="lg:col-span-3 bg-slate-900 p-4 h-[60vh] lg:h-[80vh] flex flex-col">
                        <div className="flex-shrink-0">
                            <h2 className="text-base font-bold text-sky-400 border-b border-sky-400/30 pb-2 mb-4">Global Status</h2>
                            <div className="text-center mb-4">
                                <p className="text-lg text-slate-400">Total Confirmed</p>
                                <p className="text-4xl lg:text-5xl font-bold text-red-500">{formatNumber(globalInfected)}</p>
                            </div>
                             <div className="text-center">
                                <p className="text-lg text-slate-400">Total Deaths</p>
                                <p className="text-4xl lg:text-5xl font-bold text-slate-200">{formatNumber(globalDeaths)}</p>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex-grow flex flex-col overflow-hidden">
                            <h2 className="text-base font-bold text-sky-400 border-b border-sky-400/30 pb-2 mb-4 flex-shrink-0">Critical Updates</h2>
                            <div className="space-y-3 overflow-y-auto pr-2 flex-grow">
                                {tickerFeed.map((item, index) => (
                                    <button 
                                        key={index} 
                                        className="w-full text-left bg-slate-800/50 p-2 text-sm hover:bg-slate-700/50 transition-colors"
                                        onClick={() => setSelectedUpdate(item)}
                                    >
                                        <p className="text-xs text-slate-400">{item.timestamp} UTC</p>
                                        <p><span className={`font-bold ${getTickerTypeColor(item.type)}`}>{item.type}:</span> {item.text}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>
                </main>
            </div>
            <UpdateModal update={selectedUpdate} onClose={() => setSelectedUpdate(null)} />
        </div>
    );
}

