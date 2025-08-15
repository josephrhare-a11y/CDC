// FIREBASE DO NOT DELETE
const __firebase_config = '\n{\n  "apiKey": "AIzaSyCqyCcs2R2e7AegGjvFAwG98wlamtbHvZY",\n  "authDomain": "bard-frontend.firebaseapp.com",\n  "projectId": "bard-frontend",\n  "storageBucket": "bard-frontend.firebasestorage.app",\n  "messagingSenderId": "175205271074",\n  "appId": "1:175205271074:web:2b7bd4d34d33bf38e6ec7b"\n}\n'
// FIREBASE DO NOT DELETE
// This is a complete, self-contained React application for a Halloween escape room.
// It uses Firebase Firestore to save and retrieve player progress.
// The app uses a webcam to scan a QR code on a player's ID badge, which
// identifies them and allows them to enter answers for puzzles.

import React, { useState, useEffect } from 'react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

// Zxing library for QR code scanning
// This is the CDN link for the QR code scanning library.
const QR_SCANNER_CDN = "https://cdn.jsdelivr.net/npm/@zxing/library@0.19.1/umd/index.min.js";

// Tailwind CSS is used for styling. No additional CSS is required.
// The font 'Creepster' is a custom spooky font loaded from Google Fonts.



// --- Main App Component ---
export default function App() {
    // State variables for the app
    const [userId, setUserId] = useState(null);
    const [appId, setAppId] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [player, setPlayer] = useState(null);
    const [scannedId, setScannedId] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [puzzleInput, setPuzzleInput] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [currentPuzzle, setCurrentPuzzle] = useState(null);
    const [message, setMessage] = useState(null);
    // State to control which screen is displayed
    const [screen, setScreen] = useState('scan'); // 'scan', 'profileCreated', 'homepage', 'puzzle', 'completed'
    const [playerNameInput, setPlayerNameInput] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [newProfileIdInput, setNewProfileIdInput] = useState('');

    // QR code data URI
    const [qrDataUri, setQrDataUri] = useState('');

    // Initial puzzle data. Now with 8 puzzles and a points value.
    const puzzles = {
        'puzzle-1': {
            id: 'puzzle-1',
            title: 'Riddle of the Eye',
            difficulty: 'easy',
            points: 10,
            question: 'The first clue is a riddle. What has an eye, but cannot see?',
            answer: 'needle',
            clue: 'You are on the right track! The next puzzle clue is hidden in the study.',
            hint: 'Think about sewing and a common tool.'
        },
        'puzzle-2': {
            id: 'puzzle-2',
            title: 'Map of a Strange Land',
            difficulty: 'easy',
            points: 10,
            question: 'I have cities, but no houses; forests, but no trees; and water, but no fish. What am I?',
            answer: 'map',
            clue: 'Excellent work! The next puzzle is in the master bedroom.',
            hint: 'It\'s a geographical representation, not the real thing.'
        },
        'puzzle-3': {
            id: 'puzzle-3',
            title: 'Unseen Future',
            difficulty: 'easy',
            points: 10,
            question: 'What is always in front of you but can’t be seen?',
            answer: 'future',
            clue: 'Great job! Look under the old rug for your next hint.',
            hint: 'It\'s something you look forward to, but can\'t yet see.'
        },
        'puzzle-4': {
            id: 'puzzle-4',
            title: 'Head and Tail',
            difficulty: 'easy',
            points: 10,
            question: 'I have a head and a tail, but no body. What am I?',
            answer: 'coin',
            clue: "You're getting warmer! The next clue is on the bookshelf.",
            hint: 'This is a form of currency.'
        },
        'puzzle-5': {
            id: 'puzzle-5',
            title: 'The Unbreakable',
            difficulty: 'hard',
            points: 25,
            question: 'What can be broken without being touched?',
            answer: 'promise',
            clue: 'You are on fire! The next clue is in the attic.',
            hint: 'It\'s an agreement that can be broken, not a physical object.'
        },
        'puzzle-6': {
            id: 'puzzle-6',
            title: 'Speaking Without a Mouth',
            difficulty: 'hard',
            points: 25,
            question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?',
            answer: 'echo',
            clue: 'Good thinking! Check the old mirror for the next hint.',
            hint: 'Consider the concept of sound bouncing back.'
        },
        'puzzle-7': {
            id: 'puzzle-7',
            title: 'River of Knowledge',
            difficulty: 'hard',
            points: 25,
            question: 'What has a neck but no head, and a body but no legs?',
            answer: 'shirt',
            clue: 'You are very close! The final puzzle is inside the kitchen cabinet.',
            hint: 'Look for something you wear, but the riddle describes parts of a human body.'
        },
        'puzzle-8': {
            id: 'puzzle-8',
            title: 'Shadow of the Mind',
            difficulty: 'hard',
            points: 25,
            question: 'The more you take, the more you leave behind. What are they?',
            answer: 'footsteps',
            clue: 'Congratulations! You have completed all the puzzles!',
            hint: 'Think about the trail you leave behind when you walk.'
        }
    };
    
    // An array to define the order of all puzzles.
    const puzzleOrder = Object.keys(puzzles);

    // --- Firebase Setup and Authentication ---
    useEffect(() => {
        // This effect runs once to initialize Firebase and authenticate the user.
        const initializeFirebase = async () => {
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

            if (firebaseConfig) {
                const app = initializeApp(firebaseConfig);
                const firestoreDb = getFirestore(app);
                const firestoreAuth = getAuth(app);

                setDb(firestoreDb);
                setAuth(firestoreAuth);
                setAppId(currentAppId);

                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(firestoreAuth, initialAuthToken);
                    } else {
                        await signInAnonymously(firestoreAuth);
                    }
                } catch (error) {
                    console.error('Firebase auth error:', error);
                }

                firestoreAuth.onAuthStateChanged(user => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        setUserId(null);
                    }
                    setIsAuthReady(true);
                });
            } else {
                console.warn('Firebase config not found. Running in demo mode.');
                setIsAuthReady(true);
            }
        };

        initializeFirebase();
    }, []);

    // --- Data Fetching from Firestore ---
    useEffect(() => {
        // This effect listens for real-time updates to the player's data in Firestore.
        if (!isAuthReady || !db || !userId || !scannedId) {
            return;
        }

        const playerDocRef = doc(db, 'artifacts', appId, 'users', userId, 'players', scannedId);

        const unsubscribe = onSnapshot(playerDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                // Player exists, load their data and go to the homepage
                const playerData = docSnap.data();
                setPlayer(playerData);
                const allPuzzlesCompleted = puzzleOrder.every(pId => playerData.completedPuzzles[pId]);
                if (allPuzzlesCompleted) {
                    setScreen('completed');
                    setMessage('You have completed all the puzzles! Congratulations!');
                } else {
                    setScreen('homepage');
                }
            } else {
                // New player, go to the profile creation screen
                setScreen('createProfile');
            }
            setIsScanning(false);
        }, (error) => {
            console.error('Firestore listen error:', error);
            setMessage('Failed to load player data. Please try again.');
        });

        // Cleanup function to detach the listener when the component unmounts.
        return () => unsubscribe();
    }, [isAuthReady, db, userId, appId, scannedId]);


    // --- QR Code Scanning Logic ---
    useEffect(() => {
        // This effect handles the QR code scanner initialization and cleanup.
        if (!isScanning) {
            return;
        }

        const loadScanner = async () => {
            try {
                if (typeof window.ZXing === 'undefined') {
                    const script = document.createElement('script');
                    script.src = "https://cdn.jsdelivr.net/npm/@zxing/library@0.19.1/umd/index.min.js";
                    document.body.appendChild(script);
                    await new Promise((resolve) => script.onload = resolve);
                }

                const codeReader = new window.ZXing.BrowserMultiFormatReader();
                const videoElement = document.getElementById('scanner-video');

                codeReader.decodeFromVideoDevice(null, videoElement, (result, err) => {
                    if (result) {
                        const newScannedId = result.getText();
                        setScannedId(newScannedId);
                        setIsScanning(false);
                        codeReader.reset();
                    }
                    if (err && !(err instanceof window.ZXing.NotFoundException)) {
                        console.error('QR code scanning error:', err);
                        setMessage('QR scanning failed. Please try again or use a different device.');
                        codeReader.reset();
                        setIsScanning(false);
                    }
                });
            } catch (err) {
                console.error('Error loading or starting scanner:', err);
                setMessage('Camera access failed. Please ensure you have given permission.');
                setIsScanning(false);
            }
        };

        loadScanner();

        return () => {
            if (window.ZXing) {
                const codeReader = new window.ZXing.BrowserMultiFormatReader();
                codeReader.reset();
            }
        };
    }, [isScanning]);

    // --- QR Code Generation Logic ---
    useEffect(() => {
        if (screen === 'profileCreated' && player?.playerId) {
            const generateQRCode = async () => {
                try {
                    if (typeof QRCode === 'undefined') {
                        const script = document.createElement('script');
                        script.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js";
                        document.body.appendChild(script);
                        await new Promise(resolve => script.onload = resolve);
                    }
                    const dataUri = await QRCode.toDataURL(player.playerId, {
                        width: 256,
                        color: { dark: '#FFFFFF', light: '#00000000' }
                    });
                    setQrDataUri(dataUri);
                } catch (err) {
                    console.error('QR code generation error:', err);
                }
            };
            generateQRCode();
        }
    }, [screen, player]);


    // --- Event Handlers ---
    const handleStartScan = () => {
        // Resets state and starts the QR code scanner.
        setScannedId('');
        setPlayer(null);
        setCurrentPuzzle(null);
        setFeedback(null);
        setPuzzleInput('');
        setMessage(null);
        setScreen('scan');
        setIsScanning(true);
        setShowHint(false);
    };
    
    const handleNewProfile = () => {
        setScreen('newProfile');
        setScannedId('');
        setPlayerNameInput('');
        setNewProfileIdInput('');
    };

    const handleCreateProfile = async () => {
        const newId = newProfileIdInput.trim();
        if (!newId || !playerNameInput.trim()) {
            setMessage('Please enter both an ID and your name to create a profile.');
            return;
        }

        if (!db || !appId || !userId) {
            setMessage('Database not ready. Please wait a moment and try again.');
            return;
        }

        const playerDocRef = doc(db, 'artifacts', appId, 'users', userId, 'players', newId);
        
        try {
            // Check if the player ID already exists before creating a new one.
            const docSnap = await getDoc(playerDocRef);
            if (docSnap.exists()) {
                setMessage('That Player ID already exists. Please choose a different one.');
                return;
            }

            const newPlayer = {
                playerId: newId,
                name: playerNameInput.trim(),
                completedPuzzles: {},
                totalPoints: 0,
            };

            await setDoc(playerDocRef, newPlayer);
            setPlayer(newPlayer);
            setScannedId(newId);
            setScreen('profileCreated');
        } catch (error) {
            console.error('Error creating new player:', error);
            setMessage('An error occurred while creating your profile. Please try again.');
        }
    };
    
    const handleScanFlow = () => {
        setScreen('scan');
        handleStartScan();
    };

    const handleSelectPuzzle = (puzzleId) => {
        setCurrentPuzzle(puzzles[puzzleId]);
        setFeedback(null); // Clear previous feedback
        setPuzzleInput('');
        setScreen('puzzle');
        setShowHint(false); // Reset hint state for the new puzzle
    };

    const handleAnswerSubmit = async () => {
        // Handles the player's answer submission.
        if (!player || !currentPuzzle || !db) {
            return;
        }

        if (puzzleInput.toLowerCase().trim() === currentPuzzle.answer.toLowerCase().trim()) {
            setFeedback({ type: 'success', message: 'Correct! ' + currentPuzzle.clue });

            const playerDocRef = doc(db, 'artifacts', appId, 'users', userId, 'players', player.playerId);
            const updatedCompletedPuzzles = { ...player.completedPuzzles, [currentPuzzle.id]: true };
            const updatedTotalPoints = player.totalPoints + currentPuzzle.points;

            try {
                await setDoc(playerDocRef, { 
                    ...player, 
                    completedPuzzles: updatedCompletedPuzzles,
                    totalPoints: updatedTotalPoints
                });
                setPuzzleInput('');
                // After a short delay, go back to the homepage.
                setTimeout(() => {
                    setScreen('homepage');
                    setCurrentPuzzle(null);
                }, 2000);
            } catch (error) {
                console.error('Error updating player data:', error);
                setFeedback({ type: 'error', message: 'An error occurred while saving your progress. Please try again.' });
            }
        } else {
            setFeedback({ type: 'error', message: 'That is not the correct answer. Try again!' });
        }
    };

    const handleShowHint = () => {
        setShowHint(true);
    };

    // --- Render Logic ---
    const renderContent = () => {
        if (!isAuthReady) {
            return (
                <div className="flex items-center justify-center h-full">
                    <span className="text-3xl font-creepy text-white animate-pulse">Loading...</span>
                </div>
            );
        }

        switch (screen) {
            case 'scan':
                if (isScanning) {
                    return (
                        <div className="flex flex-col items-center justify-center p-6 space-y-6">
                            <h2 className="text-4xl font-creepy text-red-400 text-center drop-shadow-lg animate-pulse">
                                Scanning for ID...
                            </h2>
                            <div className="relative w-full max-w-md h-64 overflow-hidden rounded-xl shadow-2xl border-4 border-red-500 bg-black">
                                <video id="scanner-video" className="w-full h-full object-cover"></video>
                                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-10 pointer-events-none">
                                    <div className="w-2/3 h-2/3 border-4 border-red-400 rounded-lg shadow-[0_0_20px_5px_rgba(255,0,0,0.5)] animate-scan-line"></div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsScanning(false)}
                                className="bg-gray-800 text-white font-creepy text-xl px-6 py-3 rounded-full shadow-lg hover:bg-gray-700 transition duration-300 transform hover:scale-105"
                            >
                                Cancel Scan
                            </button>
                        </div>
                    );
                } else {
                    return (
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-8">
                            <h1 className="text-6xl font-creepy text-red-400 animate-pulse drop-shadow-lg">
                                CDC Outbreak
                            </h1>
                            <p className="text-xl text-gray-300 max-w-md">
                                To begin your mission, please scan your Agent ID card using the camera below or create a new profile.
                            </p>
                            <div className="flex space-x-4">
                                <button
                                    onClick={handleScanFlow}
                                    className="bg-red-600 text-white font-creepy text-xl px-8 py-4 rounded-full shadow-lg hover:bg-red-700 transition duration-300 transform hover:scale-110"
                                >
                                    Scan ID Card
                                </button>
                                <button
                                    onClick={handleNewProfile}
                                    className="bg-blue-600 text-white font-creepy text-xl px-8 py-4 rounded-full shadow-lg hover:bg-blue-700 transition duration-300 transform hover:scale-110"
                                >
                                    Create New Profile
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mt-4 max-w-md">
                                {userId && (
                                    <>Your User ID: <span className="font-mono text-gray-400 break-all">{userId}</span></>
                                )}
                            </p>
                        </div>
                    );
                }
            case 'newProfile':
                return (
                    <div className="flex flex-col items-center p-6 space-y-6">
                        <h2 className="text-4xl font-creepy text-yellow-400 text-center drop-shadow-lg">
                            Create New Profile
                        </h2>
                        <p className="text-lg text-gray-300 text-center max-w-md">
                            Enter your desired Agent ID and your name to create a new profile. Your Agent ID can be a simple name or number.
                        </p>
                        <div className="w-full max-w-md p-6 bg-gray-900 rounded-xl shadow-2xl border-2 border-yellow-600 animate-fade-in">
                            <input
                                type="text"
                                className="w-full p-3 mb-4 text-lg text-white bg-gray-800 rounded-lg border-2 border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-500"
                                placeholder="Enter desired Agent ID"
                                value={newProfileIdInput}
                                onChange={(e) => setNewProfileIdInput(e.target.value)}
                            />
                            <input
                                type="text"
                                className="w-full p-3 mb-4 text-lg text-white bg-gray-800 rounded-lg border-2 border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-500"
                                placeholder="Enter your name here"
                                value={playerNameInput}
                                onChange={(e) => setPlayerNameInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
                            />
                            <button
                                onClick={handleCreateProfile}
                                className="w-full bg-yellow-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:bg-yellow-700 transition duration-300 transform hover:scale-105"
                            >
                                Create Profile
                            </button>
                            {message && (
                                <div className={`mt-4 p-4 rounded-lg font-bold text-center bg-red-800 text-red-200`}>
                                    {message}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setScreen('scan')}
                            className="mt-8 bg-gray-800 text-white font-creepy text-xl px-6 py-3 rounded-full shadow-lg hover:bg-gray-700 transition duration-300 transform hover:scale-105"
                        >
                            Go Back
                        </button>
                    </div>
                );
            case 'createProfile':
                return (
                    <div className="flex flex-col items-center p-6 space-y-6">
                        <h2 className="text-4xl font-creepy text-yellow-400 text-center drop-shadow-lg">
                            New Player Detected
                        </h2>
                        <p className="text-lg text-gray-300 text-center max-w-md">
                            Your Agent ID **{scannedId}** is not in our system. Please enter your name to create a profile.
                        </p>
                        <div className="w-full max-w-md p-6 bg-gray-900 rounded-xl shadow-2xl border-2 border-yellow-600 animate-fade-in">
                            <input
                                type="text"
                                className="w-full p-3 mb-4 text-lg text-white bg-gray-800 rounded-lg border-2 border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-500"
                                placeholder="Enter your name here"
                                value={playerNameInput}
                                onChange={(e) => setPlayerNameInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
                            />
                            <button
                                onClick={handleCreateProfile}
                                className="w-full bg-yellow-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:bg-yellow-700 transition duration-300 transform hover:scale-105"
                            >
                                Create Profile
                            </button>
                            {message && (
                                <div className={`mt-4 p-4 rounded-lg font-bold text-center bg-red-800 text-red-200`}>
                                    {message}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleStartScan}
                            className="mt-8 bg-gray-800 text-white font-creepy text-xl px-6 py-3 rounded-full shadow-lg hover:bg-gray-700 transition duration-300 transform hover:scale-105"
                        >
                            Scan a Different ID
                        </button>
                    </div>
                );
            case 'profileCreated':
                if (!player) {
                    return (
                        <div className="flex items-center justify-center h-full">
                            <span className="text-3xl font-creepy text-white animate-pulse">Generating QR Code...</span>
                        </div>
                    );
                }
                return (
                    <div className="flex flex-col items-center p-6 space-y-6">
                        <h2 className="text-4xl font-creepy text-green-400 text-center drop-shadow-lg">
                            Profile Created!
                        </h2>
                        <p className="text-lg text-gray-300 text-center max-w-md">
                            Your new profile for **{player.name}** has been saved. Take a picture of this QR code to log in next time!
                        </p>
                        <div className="p-4 bg-white rounded-xl shadow-2xl border-4 border-green-600">
                            {qrDataUri ? (
                                <img src={qrDataUri} alt="Player QR Code" className="w-64 h-64" />
                            ) : (
                                <div className="w-64 h-64 flex items-center justify-center">
                                    <span className="text-gray-500">Generating...</span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setScreen('homepage')}
                            className="mt-8 bg-green-600 text-white font-creepy text-xl px-6 py-3 rounded-full shadow-lg hover:bg-green-700 transition duration-300 transform hover:scale-105"
                        >
                            Continue to Game
                        </button>
                    </div>
                );
            case 'homepage':
                if (!player) {
                    return (
                        <div className="flex items-center justify-center h-full">
                            <span className="text-3xl font-creepy text-white animate-pulse">Loading player data...</span>
                        </div>
                    );
                }

                const easyPuzzles = Object.values(puzzles).filter(p => p.difficulty === 'easy');
                const hardPuzzles = Object.values(puzzles).filter(p => p.difficulty === 'hard');

                return (
                    <div className="flex flex-col items-center p-6 space-y-6">
                        <div className="w-full max-w-4xl flex justify-between items-center mb-4">
                            <h2 className="text-5xl font-creepy text-green-400 drop-shadow-lg">
                                Welcome, {player.name}!
                            </h2>
                            <div className="p-4 bg-gray-800 rounded-lg shadow-xl border-2 border-green-600 flex items-center space-x-2">
                                <span className="text-xl text-green-400 font-bold">Total Points:</span>
                                <span className="text-3xl text-green-200 font-creepy">{player.totalPoints || 0}</span>
                            </div>
                        </div>

                        <p className="text-lg text-gray-300 text-center">
                            Select a puzzle to begin your mission.
                        </p>

                        {/* Easy Puzzles Section */}
                        <div className="w-full max-w-4xl">
                            <h3 className="text-3xl font-creepy text-yellow-400 mb-4 border-b-2 border-yellow-600 pb-2">Quarantine Zone</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {easyPuzzles.map(puzzle => (
                                    <button
                                        key={puzzle.id}
                                        onClick={() => handleSelectPuzzle(puzzle.id)}
                                        disabled={player.completedPuzzles[puzzle.id]}
                                        className={`relative w-full p-6 text-left rounded-xl shadow-lg transition duration-300 transform hover:scale-105 ${
                                            player.completedPuzzles[puzzle.id]
                                                ? 'bg-green-800 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-800 text-white hover:bg-gray-700'
                                        }`}
                                    >
                                        <h4 className="text-2xl font-creepy">{puzzle.title}</h4>
                                        <span className="text-sm font-bold absolute top-2 right-2 text-yellow-400">{puzzle.points} pts</span>
                                        {player.completedPuzzles[puzzle.id] && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-green-900 bg-opacity-70 rounded-xl">
                                                <span className="text-green-300 font-bold text-lg">SOLVED</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hard Puzzles Section */}
                        <div className="w-full max-w-4xl mt-8">
                            <h3 className="text-3xl font-creepy text-red-500 mb-4 border-b-2 border-red-600 pb-2">Infection Zone</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {hardPuzzles.map(puzzle => (
                                    <button
                                        key={puzzle.id}
                                        onClick={() => handleSelectPuzzle(puzzle.id)}
                                        disabled={player.completedPuzzles[puzzle.id]}
                                        className={`relative w-full p-6 text-left rounded-xl shadow-lg transition duration-300 transform hover:scale-105 ${
                                            player.completedPuzzles[puzzle.id]
                                                ? 'bg-green-800 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-800 text-white hover:bg-gray-700'
                                        }`}
                                    >
                                        <h4 className="text-2xl font-creepy">{puzzle.title}</h4>
                                        <span className="text-sm font-bold absolute top-2 right-2 text-red-400">{puzzle.points} pts</span>
                                        {player.completedPuzzles[puzzle.id] && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-green-900 bg-opacity-70 rounded-xl">
                                                <span className="text-green-300 font-bold text-lg">SOLVED</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleStartScan}
                            className="mt-8 bg-red-600 text-white font-creepy text-xl px-6 py-3 rounded-full shadow-lg hover:bg-red-700 transition duration-300 transform hover:scale-110"
                        >
                            Scan a Different Player ID
                        </button>
                    </div>
                );
            case 'puzzle':
                if (!player) {
                    return (
                        <div className="flex items-center justify-center h-full">
                            <span className="text-3xl font-creepy text-white animate-pulse">Loading player data...</span>
                        </div>
                    );
                }
                return (
                    <div className="flex flex-col items-center p-6 space-y-6">
                        <div className="w-full max-w-lg flex justify-between items-center mb-4">
                            <h2 className="text-5xl font-creepy text-yellow-400 drop-shadow-lg">
                                {currentPuzzle.title}
                            </h2>
                            <div className="p-2 bg-gray-800 rounded-lg shadow-xl border-2 border-yellow-600 flex items-center space-x-2">
                                <span className="text-lg text-yellow-400 font-bold">Points:</span>
                                <span className="text-2xl text-yellow-200 font-creepy">{player.totalPoints || 0}</span>
                            </div>
                        </div>

                        <div className="w-full max-w-lg p-6 bg-gray-900 rounded-xl shadow-2xl border-2 border-yellow-600 animate-fade-in">
                            <p className="text-lg text-gray-300 mb-4">{currentPuzzle.question}</p>
                            <input
                                type="text"
                                className="w-full p-3 mb-4 text-lg text-white bg-gray-800 rounded-lg border-2 border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-500"
                                placeholder="Enter your answer here"
                                value={puzzleInput}
                                onChange={(e) => setPuzzleInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAnswerSubmit()}
                            />
                            <button
                                onClick={handleAnswerSubmit}
                                className="w-full bg-yellow-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:bg-yellow-700 transition duration-300 transform hover:scale-105"
                            >
                                Submit Answer
                            </button>
                            {feedback && (
                                <div className={`mt-4 p-4 rounded-lg font-bold text-center ${
                                    feedback.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
                                }`}>
                                    {feedback.message}
                                </div>
                            )}
                            {showHint && (
                                <div className="mt-4 p-4 rounded-lg bg-gray-700 border border-gray-500 text-gray-300">
                                    <p className="font-bold text-lg">Hint:</p>
                                    <p>{currentPuzzle.hint}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex space-x-4 mt-8">
                            <button
                                onClick={handleShowHint}
                                className="bg-blue-600 text-white font-creepy text-xl px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105"
                            >
                                Get a Hint
                            </button>
                            <button
                                onClick={() => setScreen('homepage')}
                                className="bg-gray-800 text-white font-creepy text-xl px-6 py-3 rounded-full shadow-lg hover:bg-gray-700 transition duration-300 transform hover:scale-105"
                            >
                                Go Back to Puzzle List
                            </button>
                        </div>
                    </div>
                );
            case 'completed':
                if (!player) {
                    return (
                        <div className="flex items-center justify-center h-full">
                            <span className="text-3xl font-creepy text-white animate-pulse">Loading player data...</span>
                        </div>
                    );
                }
                return (
                    <div className="p-8 text-center space-y-6">
                        <p className="text-6xl font-creepy text-green-400 drop-shadow-lg animate-pulse">{message}</p>
                        <p className="text-xl text-gray-300">Mission accomplished. You have successfully escaped!</p>
                        <div className="p-4 bg-gray-800 rounded-lg shadow-xl border-2 border-green-600 flex flex-col items-center space-y-2 mt-4">
                            <span className="text-2xl text-green-400 font-bold">Final Score:</span>
                            <span className="text-4xl text-green-200 font-creepy">{player.totalPoints}</span>
                        </div>
                        <button
                            onClick={handleStartScan}
                            className="mt-8 bg-red-600 text-white font-creepy text-xl px-6 py-3 rounded-full shadow-lg hover:bg-red-700 transition duration-300 transform hover:scale-110"
                        >
                            Start a New Game
                        </button>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center justify-center h-full">
                        <span className="text-3xl font-creepy text-white">Something went wrong.</span>
                    </div>
                    );
        }
    };

    // --- Main Render ---
    return (
        <div className="relative min-h-screen bg-gray-950 text-white font-sans overflow-hidden">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Creepster&display=swap');
                .font-creepy { font-family: 'Creepster', cursive; }
                .animate-scan-line {
                    animation: scan-pulse 1s infinite alternate;
                }
                @keyframes scan-pulse {
                    from { box-shadow: 0 0 5px 2px rgba(255, 0, 0, 0.5); }
                    to { box-shadow: 0 0 20px 5px rgba(255, 0, 0, 0.8); }
                }
                .animate-hover-pulse {
                    animation: hover-pulse 2s infinite;
                }
                @keyframes hover-pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                `}
            </style>
            <div className="absolute inset-0 bg-repeat" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%23111111' d='M50 0a50 50 0 100 100A50 50 0 0050 0zm0 14a36 36 0 110 72 36 36 0 010-72zM50 20a30 30 0 100 60 30 30 0 000-60zm0 10a20 20 0 110 40 20 20 0 010-40zM50 40a10 10 0 100 20 10 10 0 000-20z'/%3E%3Cpath fill='%234d4d4d' d='M50 50a10 10 0 100 20 10 10 0 000-20z'/%3E%3C/svg%3E")`, opacity: '0.1' }}></div>
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-3xl bg-gray-900 rounded-3xl shadow-2xl p-8 border-4 border-gray-800">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
