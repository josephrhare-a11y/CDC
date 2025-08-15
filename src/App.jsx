// FIREBASE DO NOT DELETE
const __firebase_config = '\n{\n  "apiKey": "AIzaSyCqyCcs2R2e7AegGjvFAwG98wlamtbHvZY",\n  "authDomain": "bard-frontend.firebaseapp.com",\n  "projectId": "bard-frontend",\n  "storageBucket": "bard-frontend.firebasestorage.app",\n  "messagingSenderId": "175205271074",\n  "appId": "1:175205271074:web:2b7bd4d34d33bf38e6ec7b"\n}\n'
// FIREBASE DO NOT DELETE

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, collection, query, orderBy, limit, getDocs, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

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
const LoginScreen = ({ onLogin, onClearData }) => {
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [showResetPrompt, setShowResetPrompt] = useState(false);
    const [resetPassword, setResetPassword] = useState('');
    const [resetError, setResetError] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const [scores, setScores] = useState([]);
    const [isLoadingScores, setIsLoadingScores] = useState(true);
    const appId = getAppId();

    // Effect to fetch leaderboard data
    useEffect(() => {
        const leaderboardColRef = collection(db, 'artifacts', appId, 'public/data/leaderboard');
        const q = query(leaderboardColRef, orderBy('points', 'desc'), limit(5)); // Show top 5

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const scoresData = [];
            querySnapshot.forEach((doc) => {
                scoresData.push({ id: doc.id, ...doc.data() });
            });
            setScores(scoresData);
            setIsLoadingScores(false);
        }, (error) => {
            console.error("Error fetching leaderboard for login screen: ", error);
            setIsLoadingScores(false);
        });

        return () => unsubscribe();
    }, [appId]);

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

    const handleAttemptReset = async () => {
        setResetError('');
        setResetSuccess('');
        if (resetPassword !== 'admin') {
            setResetError('Incorrect password.');
            return;
        }
        setIsResetting(true);
        const result = await onClearData();
        if (result.success) {
            setResetSuccess(result.message);
            setTimeout(() => setResetSuccess(''), 5000); // Clear message after 5s
        } else {
            setResetError(result.message);
        }
        setIsResetting(false);
        setResetPassword('');
        setShowResetPrompt(false);
    };
    
    const getRankColor = (index) => {
        if (index === 0) return 'text-yellow-400';
        if (index === 1) return 'text-gray-300';
        if (index === 2) return 'text-yellow-600';
        return 'text-gray-400';
    };

    return (
        <div className="w-full max-w-4xl p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-center">
            {/* Login Panel */}
            <div className="w-full lg:w-1/2">
                <div className="w-full max-w-md mx-auto p-8 space-y-6 bg-gray-800 bg-opacity-80 rounded-2xl shadow-lg border border-red-500/50 backdrop-blur-sm">
                    <div className="text-center">
                        <BiohazardIcon />
                        <h1 className="text-4xl font-bold text-red-500 tracking-wider mt-2">OUTBREAK</h1>
                        <p className="text-gray-300 mt-2">Global Epidemic Protocol</p>
                    </div>
                    {resetSuccess && <p className="text-green-400 text-center text-sm bg-green-900/50 p-2 rounded-md">{resetSuccess}</p>}
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
                    <div className="mt-6 text-center">
                        {!showResetPrompt ? (
                            <button onClick={() => { setShowResetPrompt(true); setResetError(''); setResetSuccess(''); }} className="text-xs text-gray-500 hover:text-red-400 transition">
                                System Reset
                            </button>
                        ) : (
                            <div className="p-4 bg-gray-900/50 rounded-lg mt-4 space-y-3 animate-fade-in">
                                <label htmlFor="reset-password" className="text-sm font-bold text-gray-400 block">Enter Admin Password:</label>
                                <input
                                    id="reset-password"
                                    type="password"
                                    value={resetPassword}
                                    onChange={(e) => setResetPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                    onKeyPress={(e) => e.key === 'Enter' && handleAttemptReset()}
                                />
                                {resetError && <p className="text-red-400 text-sm">{resetError}</p>}
                                <div className="flex gap-2 justify-center">
                                     <button onClick={() => setShowResetPrompt(false)} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg text-xs font-semibold">Cancel</button>
                                    <button onClick={handleAttemptReset} disabled={isResetting} className="py-2 px-4 bg-red-800 hover:bg-red-700 rounded-lg text-xs font-bold disabled:bg-red-900">
                                        {isResetting ? 'Resetting...' : 'Confirm Reset'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Leaderboard Panel */}
            <div className="w-full lg:w-1/2 bg-gray-800 bg-opacity-80 rounded-2xl shadow-lg border border-blue-500/50 p-6 backdrop-blur-sm">
                <h2 className="text-3xl font-bold text-blue-400 mb-4 text-center">Top Agents</h2>
                {isLoadingScores ? (
                    <p className="text-center">Loading rankings...</p>
                ) : scores.length === 0 ? (
                    <p className="text-center text-gray-400">No agent data available.</p>
                ) : (
                    <ul className="space-y-3">
                         {scores.map((player, index) => (
                            <li key={player.id} className={`flex items-center justify-between p-3 rounded-lg ${index < 3 ? 'bg-gray-700/80' : 'bg-gray-700/50'}`}>
                                <div className="flex items-center">
                                    <span className={`font-bold text-lg w-8 ${getRankColor(index)}`}>{index + 1}</span>
                                    <span className="font-semibold">{player.username}</span>
                                </div>
                                <span className={`font-bold text-lg ${getRankColor(index)}`}>{player.points} pts</span>
                            </li>
                        ))}
                    </ul>
                )}
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
            // Update private user document
            const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'players', user.username);
            await updateDoc(userDocRef, { points: newPoints, solvedPuzzles: newSolvedPuzzles });

            // Update public leaderboard document
            const leaderboardDocRef = doc(db, 'artifacts', appId, 'public/data/leaderboard', user.username);
            await setDoc(leaderboardDocRef, { username: user.username, points: newPoints }, { merge: true });

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
            <header className="flex flex-wrap justify-between items-center gap-4 mb-8 p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">Agent: <span className="text-red-500">{user.username}</span></h1>
                    <p className="text-gray-400">STATUS: ACTIVE</p>
                </div>
                <div className="text-center">
                    <p className="text-lg text-gray-300">Total Points</p>
                    <p className="text-5xl font-bold text-yellow-400 tracking-widest">{user.points}</p>
                </div>
                 <div className="text-center">
                    <p className="text-sm text-red-500/80">SESSION TERMINATES IN:</p>
                    <p className="text-3xl font-mono font-bold text-red-500">{remainingTime}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onLogout} className="py-2 px-6 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-semibold">Log Off</button>
                </div>
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
                // If we have a user, set the ID and we're ready.
                setUserId(firebaseUser.uid);
                setIsLoading(false);
            } else {
                // If there's no user, attempt to sign in.
                try {
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        await signInWithCustomToken(auth, __initial_auth_token);
                    } else {
                        await signInAnonymously(auth);
                    }
                    // After a successful sign-in, onAuthStateChanged will run again with a user object.
                } catch (error) {
                    console.error("Authentication failed:", error);
                    // If auth fails, stop loading so the app doesn't hang.
                    setIsLoading(false);
                }
            }
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
                
                // Also create a public leaderboard entry for the new user
                const leaderboardDocRef = doc(db, 'artifacts', appId, 'public/data/leaderboard', username);
                await setDoc(leaderboardDocRef, { username: username, points: 0 }, { merge: true });

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
    
    const handleClearData = async () => {
        try {
            const leaderboardColRef = collection(db, 'artifacts', appId, 'public/data/leaderboard');
            const leaderboardSnapshot = await getDocs(leaderboardColRef);
            const deletePromises = [];
            leaderboardSnapshot.forEach((doc) => {
                deletePromises.push(deleteDoc(doc.ref));
            });
            await Promise.all(deletePromises);
            
            // NOTE: This only clears the public leaderboard. Due to security rules,
            // clearing all private user data from the client-side is not feasible
            // without compromising security. This would typically be handled by a
            // secure backend function with admin privileges.
            
            return { success: true, message: 'All public leaderboard data has been cleared.' };
        } catch (error) {
            console.error("Error clearing data: ", error);
            return { success: false, message: 'Failed to clear data due to permissions.' };
        }
    };

    return (
        <div 
            className="min-h-screen bg-gray-900 text-white font-sans flex items-center justify-center p-4" 
            style={{ 
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg id='hexagons' fill='%23ff0000' fill-opacity='0.05' fill-rule='nonzero'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.99-7.5L26 15v18.5l-13 7.5L0 33.5V15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
            }}
        >
            <div className="absolute inset-0 bg-black opacity-60"></div>
            <div className="relative z-10 w-full">
                {isLoading ? (
                    <div className="text-center text-xl">Initializing System...</div>
                ) : user ? (
                    <GameScreen user={user} onLogout={handleLogout} />
                ) : (
                    <LoginScreen onLogin={handleLogin} onClearData={handleClearData} />
                )}
            </div>
        </div>
    );
}
