// FIREBASE DO NOT DELETE
const __firebase_config = '\n{\n  "apiKey": "AIzaSyCqyCcs2R2e7AegGjvFAwG98wlamtbHvZY",\n  "authDomain": "bard-frontend.firebaseapp.com",\n  "projectId": "bard-frontend",\n  "storageBucket": "bard-frontend.firebasestorage.app",\n  "messagingSenderId": "175205271074",\n  "appId": "1:175205271074:web:2b7bd4d34d33bf38e6ec7b"\n}\n'
// FIREBASE DO NOT DELETE

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- Helper function to get App ID ---
const getAppId = () => {
    return typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
};

// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- SVG Icons ---
const BiohazardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5c-4.14 0-7.5 3.36-7.5 7.5S7.86 19.5 12 19.5s7.5-3.36 7.5-7.5S16.14 4.5 12 4.5zm0 1.5c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0" />
    </svg>
);

// --- Inactivity Timer Hook ---
const useIdleTimer = (onIdle, timeout = 10000) => {
    const [remainingTime, setRemainingTime] = useState(timeout / 1000);
    const timeoutId = useRef(null);
    const intervalId = useRef(null);

    useEffect(() => {
        const resetTimer = () => {
            if (timeoutId.current) clearTimeout(timeoutId.current);
            if (intervalId.current) clearInterval(intervalId.current);

            setRemainingTime(timeout / 1000);

            timeoutId.current = setTimeout(onIdle, timeout);

            intervalId.current = setInterval(() => {
                setRemainingTime(prevTime => {
                    if (prevTime <= 1) {
                        clearInterval(intervalId.current);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        };

        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
        
        resetTimer();
        events.forEach(event => window.addEventListener(event, resetTimer, { capture: true }));

        return () => {
            events.forEach(event => window.removeEventListener(event, resetTimer, { capture: true }));
            if (timeoutId.current) clearTimeout(timeoutId.current);
            if (intervalId.current) clearInterval(intervalId.current);
        };
    }, [onIdle, timeout]);

    return remainingTime;
};


// --- Login Screen Component ---
const LoginScreen = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!username.trim()) {
            setError('Username cannot be empty.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await onLogin(username.trim());
        } catch (err) {
            console.error("Login failed:", err);
            setError('Failed to log in. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 bg-opacity-80 rounded-2xl shadow-lg border border-red-500/50 backdrop-blur-sm">
            <div className="text-center">
                <BiohazardIcon />
                <h1 className="text-4xl font-bold text-red-500 tracking-wider mt-2">OUTBREAK</h1>
                <p className="text-gray-300 mt-2">Global Epidemic Protocol</p>
            </div>
            <div className="space-y-4">
                <div>
                    <label htmlFor="username" className="text-sm font-bold text-gray-400 block mb-2">
                        Enter Agent Name:
                    </label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g., Agent Smith"
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300"
                        onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    />
                </div>
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold transition duration-300 disabled:bg-red-800 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Authenticating...' : 'Initiate Protocol'}
                </button>
            </div>
        </div>
    );
};

// --- Puzzle Modal Component ---
const PuzzleModal = ({ puzzle, user, onSolve, onClose, remainingTime }) => {
    const [answer, setAnswer] = useState('');
    const [error, setError] = useState('');
    const [showHint, setShowHint] = useState(false);
    const appId = getAppId();
    const userId = auth.currentUser?.uid;

    const handleSubmit = () => {
        if (answer.trim().toLowerCase() === puzzle.answer.toLowerCase()) {
            const hintUsed = user.usedHints?.includes(puzzle.id);
            const pointsAwarded = hintUsed ? puzzle.points - 1 : puzzle.points;
            onSolve(puzzle.id, pointsAwarded);
            onClose();
        } else {
            setError('Incorrect sequence. Access denied.');
            setAnswer('');
        }
    };

    const handleUseHint = async () => {
        setShowHint(true);
        if (!userId || user.usedHints?.includes(puzzle.id)) return;

        try {
            const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'players', user.username);
            const newUsedHints = [...(user.usedHints || []), puzzle.id];
            await updateDoc(userDocRef, { usedHints: newUsedHints });
        } catch (err) {
            console.error("Error updating hints:", err);
        }
    };
    
    const hintUsed = user.usedHints?.includes(puzzle.id);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 backdrop-blur-sm p-4">
            <div className="bg-gray-800 border border-yellow-500/50 rounded-xl shadow-lg w-full max-w-lg p-6 text-white animate-fade-in relative">
                <h2 className="text-2xl font-bold text-yellow-400 mb-2">{puzzle.title}</h2>
                <p className="text-gray-300 mb-4">{puzzle.question}</p>
                
                <input
                    type="text"
                    value={answer}
                    onChange={(e) => { setAnswer(e.target.value); setError(''); }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Enter your answer..."
                />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                
                <div className="mt-4">
                    <button onClick={handleUseHint} disabled={hintUsed} className="text-sm text-blue-400 hover:underline disabled:text-gray-500 disabled:no-underline">
                        {hintUsed ? 'Hint Used (-1 Point)' : 'Use Hint (-1 Point)'}
                    </button>
                    {showHint && <p className="text-sm text-gray-400 mt-2 bg-gray-700/50 p-3 rounded-lg">{puzzle.hint}</p>}
                </div>

                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold">Cancel</button>
                    <button onClick={handleSubmit} className="py-2 px-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold">Submit</button>
                </div>

                <div className="absolute bottom-4 left-6 text-sm text-red-400 font-mono">
                    Session ends in: {remainingTime}s
                </div>
            </div>
        </div>
    );
};


// --- Game Screen Component ---
const GameScreen = ({ user, onLogout }) => {
    const [activePuzzle, setActivePuzzle] = useState(null);
    const appId = getAppId();
    const userId = auth.currentUser?.uid;
    const remainingTime = useIdleTimer(onLogout, 10000);

    const puzzles = [
        { id: 'e1', difficulty: 'Easy', points: 5, title: 'Analyze DNA Sequence', question: 'In a DNA strand, what base pairs with Adenine (A)?', answer: 'Thymine', hint: 'It starts with the letter T.' },
        { id: 'e2', difficulty: 'Easy', points: 5, title: 'Calibrate Microscope', question: 'What is the standard magnification of an eyepiece lens?', answer: '10x', hint: 'It\'s a common multiple of 5.' },
        { id: 'e3', difficulty: 'Easy', points: 5, title: 'Secure Lab Access', question: 'What 3-letter agency is responsible for disease control in the USA?', answer: 'CDC', hint: 'The first word is "Centers".' },
        { id: 'm1', difficulty: 'Medium', points: 10, title: 'Synthesize Antidote', question: 'What is the chemical symbol for Gold, a catalyst in some reactions?', answer: 'Au', hint: 'From the Latin word "aurum".' },
        { id: 'm2', difficulty: 'Medium', points: 10, title: 'Trace Outbreak Source', question: 'What type of animal was the suspected original carrier of this virus?', answer: 'Bat', hint: 'A nocturnal flying mammal.' },
        { id: 'm3', difficulty: 'Medium', points: 10, title: 'Decrypt Viral Code', question: 'In computing, what does "binary" code consist of (two numbers)?', answer: '0 and 1', hint: 'It\'s the simplest numerical system.' },
        { id: 'h1', difficulty: 'Hard', points: 15, title: 'Initiate Global Quarantine', question: 'What is the study of the distribution and determinants of health-related states?', answer: 'Epidemiology', hint: 'It sounds like "epidemic".' },
        { id: 'h2', difficulty: 'Hard', points: 15, title: 'Develop Vaccine Prototype', question: 'What process involves introducing a weakened pathogen to stimulate immunity?', answer: 'Vaccination', hint: 'The solution is in the puzzle title.' },
        { id: 'h3', difficulty: 'Hard', points: 15, title: 'Broadcast Cure Formula', question: 'What famous scientist developed the first polio vaccine?', answer: 'Salk', hint: 'His last name rhymes with "walk".' },
    ];

    const handleSolvePuzzle = async (puzzleId, points) => {
        if (!userId || user.solvedPuzzles?.includes(puzzleId)) return;

        const newPoints = user.points + points;
        const newSolvedPuzzles = [...(user.solvedPuzzles || []), puzzleId];

        try {
            const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'players', user.username);
            await updateDoc(userDocRef, { points: newPoints, solvedPuzzles: newSolvedPuzzles });
        } catch (error) {
            console.error("Error updating score: ", error);
        }
    };

    const renderPuzzleSection = (difficulty) => {
        const difficultyConfig = { Easy: { color: 'green' }, Medium: { color: 'yellow' }, Hard: { color: 'red' } };
        const { color } = difficultyConfig[difficulty];

        return (
            <div className={`bg-gray-800/50 border border-${color}-500/50 rounded-xl p-4 md:p-6`}>
                <h3 className={`text-2xl font-bold text-${color}-400 mb-4`}>{difficulty} Protocols</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {puzzles.filter(p => p.difficulty === difficulty).map(puzzle => {
                        const isSolved = user.solvedPuzzles?.includes(puzzle.id);
                        return (
                            <button
                                key={puzzle.id}
                                onClick={() => setActivePuzzle(puzzle)}
                                disabled={isSolved}
                                className={`p-4 rounded-lg text-left transition duration-300 ${ isSolved ? `bg-${color}-500/30 text-gray-500 cursor-not-allowed` : `bg-gray-700 hover:bg-gray-600 text-white` }`}
                            >
                                <p className="font-semibold">{puzzle.title}</p>
                                <p className={`text-sm font-bold ${isSolved ? `text-${color}-700` : `text-${color}-400`}`}>{puzzle.points} Points</p>
                                {isSolved && <p className="text-xs text-green-400 mt-2 font-bold">✓ COMPLETED</p>}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
            {activePuzzle && <PuzzleModal puzzle={activePuzzle} user={user} onSolve={handleSolvePuzzle} onClose={() => setActivePuzzle(null)} remainingTime={remainingTime} />}
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">Agent: <span className="text-red-500">{user.username}</span></h1>
                    <p className="text-gray-400">STATUS: ACTIVE</p>
                </div>
                <div className="text-center mt-4 md:mt-0">
                    <p className="text-lg text-gray-300">Total Points</p>
                    <p className="text-5xl font-bold text-yellow-400 tracking-widest">{user.points}</p>
                </div>
                 <div className="text-center mt-4 md:mt-0">
                    <p className="text-sm text-red-500/80">SESSION TERMINATES IN:</p>
                    <p className="text-3xl font-mono font-bold text-red-500">{remainingTime}</p>
                </div>
                <button onClick={onLogout} className="mt-4 md:mt-0 py-2 px-6 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-semibold">Log Off</button>
            </header>
            <main className="space-y-6">{renderPuzzleSection('Easy')}{renderPuzzleSection('Medium')}{renderPuzzleSection('Hard')}</main>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const appId = getAppId();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUserId(firebaseUser.uid);
            } else {
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Anonymous sign-in failed:", error);
                }
            }
            setIsLoading(false);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        let unsubscribeSnapshot = null;
        if (userId && user?.username) {
            const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'players', user.username);
            unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    setUser(prevUser => ({ ...prevUser, ...docSnap.data() }));
                }
            }, (error) => {
                console.error("Snapshot listener error:", error);
            });
        }
        return () => {
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, [userId, user?.username, appId]);

    const handleLogin = async (username) => {
        if (!userId) {
            console.error("Authentication not ready.");
            return;
        }
        setIsLoading(true);
        const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'players', username);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                setUser({ username, ...docSnap.data() });
            } else {
                const newUser = { username, points: 0, solvedPuzzles: [], usedHints: [] };
                await setDoc(userDocRef, newUser);
                setUser(newUser);
            }
        } catch (error) {
            console.error("Error during login: ", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/hexabump.png')" }}>
            <div className="absolute inset-0 bg-black opacity-60"></div>
            <div className="relative z-10 w-full">
                {isLoading && !user ? (
                    <div className="text-center text-xl">Initializing System...</div>
                ) : user ? (
                    <GameScreen user={user} onLogout={handleLogout} />
                ) : (
                    <LoginScreen onLogin={handleLogin} />
                )}
            </div>
        </div>
    );
}
