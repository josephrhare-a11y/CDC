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

// const getPuzzlesCollectionPath = (appId) => `artifacts/${appId}/public/data/puzzles`;

// to

// const getPlayersCollectionPath = (appId) => `artifacts/${appId}/players`;

// const getPuzzlesCollectionPath = (appId) => `artifacts/${appId}/puzzles`;

// etc



// Change this

// const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;

// to

// const firebaseConfig = realFirebaseConfig;



// END DONT DELETE ME

import React, { useState, useEffect, useMemo, useRef } from 'react';

import { initializeApp } from 'firebase/app';

import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';

import { getFirestore, doc, getDoc, setDoc, collection, onSnapshot, setLogLevel, runTransaction, writeBatch } from 'firebase/firestore';



const getPlayersCollectionPath = (appId) => `artifacts/${appId}/players`;

const getPuzzlesCollectionPath = (appId) => `artifacts/${appId}/puzzles`;



// --- Helper Components & Functions ---



// --- Modal Component for Critical Updates ---

const UpdateModal = ({ update, onClose }) => {

    if (!update) return null;



    const getTickerTypeColor = (type) => ({ 'HOTSPOT': 'text-red-400', 'MUTATION': 'text-yellow-400', 'VACCINE': 'text-blue-400' }[type] || 'text-slate-300');



    return (

        <div 

            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"

            onClick={onClose}

        >

            <div 

                className="bg-slate-900/90 border border-slate-700 p-6 max-w-2xl w-full m-4"

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



// --- Spinner Component ---

const Spinner = () => (

    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">

        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>

        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>

    </svg>

);





// --- Secure CDC Terminal (Formerly Escape Room App) ---



const puzzles = {

    // Easy Clues (5 Points)

    'easy-lab': { title: "TR1T0N", question: "_ _ _ _ _ _ ", answer: "plague", hint: "You're looking for 6 shapes and letters. What do the letters spell?", points: 10, difficulty: "Easy", location: "TR1T0N" },

    'easy-or': { title: "P3R3S3PH0N3", question: "_ _ _ _ _ _ _", answer: "3208132", hint: "When you stand on the foot prints, can you see anything down the hall. The Patient Door should be closed..", points: 10, difficulty: "Easy", location: "P3R3S3PH0N3" },

    'easy-patient': { title: "TH4N4t05", question: "_ _ _ _", answer: "7294", hint: "Have you noticed the marks on the shower track? If you line up the door to those marks, do you see anything on the glass?.", points: 10, difficulty: "Easy", location: "TH4N4t05" },

    'easy-decon': { title: "AMPH1TR1T3", question: "_ _ _ _", answer: "2200", hint: "Have you followed the lines from each of the three vats? The vials they end at will add for your answer.", points: 10, difficulty: "Easy", location: "AMPH1TR1T3" },

    'easy-waste': { title: "S3L3n3", question: "_ _ _ - _ _ _", answer: "rhx-495", hint: "Find the small petri dishes in the fridge, match their pattern with the circles on the shelf. Once placed on the board you should see a message.", points: 10, difficulty: "Easy", location: "S3L3n3" },

    'easy-security': { title: "H3L10S", question: "_ _ _ _ _ _", answer: "helios", hint: "Find the mice with the mentioned symptoms. Put the letters in order.", points: 10, difficulty: "Easy", location: "H3L10S" },



    // Medium Clues (10 Points)

    'medium-lab': { title: "HYPN05", question: "_ _ _ _", answer: "5132", hint: "The black light will show you the vials that you need to use. Put them on the grid to reveal the answer.", points: 10, difficulty: "Medium", location: "HYPN05" },

    'medium-or': { title: "3R3BUS", question: "_ _ _ _ _", answer: "death", hint: "If you put your head where the patient is and look through the glass, you should see 3 cards. In the lab, can you use anything to reveal the answer?", points: 10, difficulty: "Medium", location: "3R3BUS" },

    'medium-patient': { title: "TYCH3", question: "_ _ _ _ _ _", answer: "a+5g56", hint: "Find what bloodtype is missing. Locate the number associated with the color. Find the Blood Sample in the test room.", points: 10, difficulty: "Medium", location: "TYCH3" },

    'medium-decon': { title: "3R03", question: "_ _ _ _", answer: "mrsa", hint: "Process of elimination will guide you to only 1 of the 6 viruses.", points: 10, difficulty: "Medium", location: "3R03" },

    'medium-waste': { title: "N3M3515", question: "_ _ _ _?", answer: "star", hint: "When the door is close, using the map - add the locations from the reports in their file order using the red string provided.", points: 10, difficulty: "Medium", location: "N3M3515" },

    'medium-security': { title: "H3C4T3", question: "_ _ _ _ _ _ _ _ _ _", answer: "quarantine", hint: "The WHY refers to the NATO alphabet. Can you find these letters in the 10 clues. This will spell your answer in order of the story, not the file numbers.", points: 10, difficulty: "Medium", location: "H3C4T3" },

    

    // Hard Clues (20 Points)

   // 'hard-lab': { title: "Virus Identification", question: "What laboratory method uses antibodies to detect the presence of a specific antigen in a patient's sample?", answer: "elisa", hint: "This test's abbreviation stands for enzyme-linked immunosorbent assay.", points: 20, difficulty: "Hard", location: "Laboratory" },

  //  'hard-or': { title: "Life Support", question: "What machine takes over the function of the heart and lungs during complex open-heart surgery?", answer: "heart-lung machine", hint: "Also known as a cardiopulmonary bypass machine.", points: 20, difficulty: "Hard", location: "Operating Room" },

   // 'hard-patient': { title: "Symptom Analysis", question: "What is the medical term for the small, pinpoint red spots on the skin caused by minor bleeding, a key symptom of hemorrhagic fevers?", answer: "petechiae", hint: "This symptom indicates bleeding underneath the skin.", points: 20, difficulty: "Hard", location: "Patient Room" },

    //'hard-decon': { title: "Gaseous Sterilant", question: "What chemical agent is often used in a gaseous state to sterilize entire rooms and sensitive equipment?", answer: "hydrogen peroxide vapor", hint: "It breaks down into water and oxygen, leaving no toxic residue.", points: 20, difficulty: "Hard", location: "Decontamination Room" },

   // 'hard-waste': { title: "Needle Disposal", question: "What type of puncture-resistant, sealed container is required for disposing of used needles and scalpels?", answer: "sharps container", hint: "The name describes exactly what it holds.", points: 20, difficulty: "Hard", location: "Hazardous Waste" },

   // 'hard-security': { title: "Epidemic Investigation", question: "In pandemic response, what is the term for tracing the contacts of an infected individual to identify others who may be exposed?", answer: "contact tracing", hint: "It's a fundamental public health strategy to control outbreaks.", points: 20, difficulty: "Hard", location: "Security Office" }

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

        <>

            <h3 className="flex-shrink-0 pb-2 mb-2 text-base font-bold text-sky-400 border-b border-sky-400/30">Current Vaccine Efficacy</h3>

            <div className="flex-grow pr-2 -mr-2 overflow-y-auto space-y-2">

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

        </>

    );

};



const QrLoginComponent = ({ onLogin }) => {

    const [jsQrLoaded, setJsQrLoaded] = useState(false);

    const [scanError, setScanError] = useState('');

    const videoRef = useRef(null);

    const canvasRef = useRef(null);

    const streamRef = useRef(null);

    const animationFrameId = useRef(null);



    useEffect(() => {

        const scriptId = "jsqr-script";

        if (document.getElementById(scriptId) || window.jsQR) {

            setJsQrLoaded(true);

            return;

        }



        const script = document.createElement('script');

        script.id = scriptId;

        script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";

        script.async = true;

        script.onload = () => setJsQrLoaded(true);

        script.onerror = () => setScanError("Could not load QR scanner library.");

        document.body.appendChild(script);



        return () => {

            if (document.body.contains(script)) {

               document.body.removeChild(script);

            }

        };

    }, []);



    const tick = () => {

        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {

            const canvas = canvasRef.current;

            const video = videoRef.current;

            const ctx = canvas.getContext("2d");



            canvas.height = video.videoHeight;

            canvas.width = video.videoWidth;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);



            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {

                inversionAttempts: "dontInvert",

            });



            if (code && code.data) {

                onLogin(code.data);

                if (streamRef.current) {

                    streamRef.current.getTracks().forEach(track => track.stop());

                }

                return; 

            }

        }

        animationFrameId.current = requestAnimationFrame(tick);

    };



    const startScanner = async () => {

        if (!jsQrLoaded) {

            setScanError("Scanner library not yet loaded.");

            return;

        }

        try {

            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

            streamRef.current = stream;

            if (videoRef.current) {

                videoRef.current.srcObject = stream;

                videoRef.current.setAttribute("playsinline", true);

                videoRef.current.play();

                animationFrameId.current = requestAnimationFrame(tick);

            }

        } catch (err) {

            setScanError('Could not access camera. Please check browser permissions.');

        }

    };



    useEffect(() => {

        startScanner();

        return () => {

            cancelAnimationFrame(animationFrameId.current);

            if (streamRef.current) {

                streamRef.current.getTracks().forEach(track => track.stop());

            }

        };

    }, [jsQrLoaded]);



    return (

        <div className="w-full max-w-xs aspect-square bg-slate-800 border border-slate-600 flex flex-col items-center justify-center p-4">

            <div className="relative w-full h-full">

                <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover"></video>

                <canvas ref={canvasRef} className="hidden"></canvas>

                <div className="absolute inset-0 border-4 border-red-500/50"></div>

                 {!scanError && <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 px-2 py-1">Scanning for Agent ID...</p>}

            </div>

        </div>

    );

};





const PuzzleAppComponent = ({ db, isAuthReady, currentUser, setCurrentUser }) => {

    // App state

    const [loading, setLoading] = useState(true);

    const [isActionLoading, setIsActionLoading] = useState(false);

    const [loadingPuzzleId, setLoadingPuzzleId] = useState(null);

    const [message, setMessage] = useState('');

    

    // Puzzle state

    const [puzzleAnswer, setPuzzleAnswer] = useState('');

    const [hintsUsed, setHintsUsed] = useState(0);



    // Inactivity Timer State

    const [countdown, setCountdown] = useState(10);

    const inactivityTimerRef = useRef(null);

    const countdownIntervalRef = useRef(null);



    useEffect(() => {

        if(!isAuthReady) {

            setLoading(true);

        } else {

            setLoading(false);

        }

    },[isAuthReady]);



    const handleLogout = () => {

        setCurrentUser(null);

        setMessage('Session terminated.');

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



    const formatUsername = (name) => {

        if (!name) return '';

        return name

            .trim()

            .toLowerCase()

            .split(' ')

            .map(word => word.charAt(0).toUpperCase() + word.slice(1))

            .join(' ');

    };



    const handleLogin = async (username) => {

        if (!username.trim() || !db) return;

        const formattedUsername = formatUsername(username);

        setIsActionLoading(true);

        try {

            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

            const userRef = doc(db, getPlayersCollectionPath(appId), formattedUsername);

            const userSnap = await getDoc(userRef);

            

            let userDataFromDb;

            if (userSnap.exists()) {

                userDataFromDb = userSnap.data();

                 // Ensure name is correctly formatted even for existing users

                if(userDataFromDb.name !== formattedUsername){

                    userDataFromDb.name = formattedUsername;

                    await setDoc(userRef, userDataFromDb, {merge: true});

                }

                setMessage(`Welcome back, Agent ${formattedUsername}.`);

            } else {

                userDataFromDb = { name: formattedUsername, score: 0, completedPuzzles: {} };

                await setDoc(userRef, userDataFromDb);

                setMessage(`Identity confirmed. Welcome, Agent ${formattedUsername}.`);

            }



            setCurrentUser({ ...userDataFromDb, activePuzzleId: null });



        } catch (error) {

            console.error("Error logging in:", error);

            setMessage("Error: Could not access secure database.");

        } finally {

            setIsActionLoading(false);

        }

    };

    

    const handlePuzzleSelect = (puzzleId) => {

        if (!currentUser || currentUser.activePuzzleId) return;

        const updatedUser = { ...currentUser, activePuzzleId: puzzleId };

        setCurrentUser(updatedUser);

        setMessage('');

    };

    

    const handleReturnToSelection = () => {

        if (!currentUser) return;

        const updatedUser = { ...currentUser, activePuzzleId: null };

        setCurrentUser(updatedUser);

        setPuzzleAnswer('');

        setHintsUsed(0);

        setMessage("Assignment selection re-enabled.");

    };



    const handlePuzzleSubmit = async (e) => {

        e.preventDefault();

        const activePuzzleId = currentUser?.activePuzzleId;

        const activePuzzle = activePuzzleId ? puzzles[activePuzzleId] : null;



        if (!puzzleAnswer.trim() || !currentUser || !activePuzzle) return;



        if (puzzleAnswer.toLowerCase() === activePuzzle.answer) {

            const pointsAwarded = Math.max(0, activePuzzle.points - hintsUsed);

            const newScore = currentUser.score + pointsAwarded;

            

            const updatedUser = { 

                name: currentUser.name,

                score: newScore, 

                completedPuzzles: { ...currentUser.completedPuzzles, [activePuzzleId]: pointsAwarded },

            };



            const updatedUserWithActivePuzzle = {...updatedUser, activePuzzleId: null};



            try {

                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

                const playerRef = doc(db, getPlayersCollectionPath(appId), currentUser.name);

                

                await setDoc(playerRef, updatedUser);

                

                setCurrentUser(updatedUserWithActivePuzzle);

                setMessage(`Correct. ${pointsAwarded} points awarded.`);

            } catch (error) {

                console.error("Error updating score:", error);

                setMessage("Error: Could not save progress.");

            }

        } else {

            setMessage("Incorrect. Try again.");

        }

        setPuzzleAnswer('');

        setHintsUsed(0);

    };



    const LoggedInHeader = () => {

        const progress = (currentUser.score / totalPossiblePoints) * 100;



        return (

            <div className="mb-4">

                <div className="flex justify-between items-center text-sm">

                    <div>

                        <p>Agent: <span className="font-bold text-yellow-400">{currentUser.name}</span></p>

                        <p>Score: <span className="font-bold text-yellow-400">{currentUser.score}</span></p>

                    </div>

                    <div className="text-center">

                         <p className="text-xs text-slate-400">Session ends in:</p>

                         <p className="text-lg font-semibold text-slate-300">{countdown}s</p>

                    </div>

                    <button onClick={handleLogout} className="px-3 py-1 text-sm font-bold text-white transition-colors bg-slate-600 hover:bg-slate-700">Log Off</button>

                </div>

                <div className="mt-2">

                    <div className="w-full bg-slate-700 h-2.5">

                        <div className="bg-yellow-500 h-2.5" style={{ width: `${progress}%` }}></div>

                    </div>

                     <p className="text-right text-xs text-slate-400 mt-1">{progress.toFixed(1)}% Vaccine Research Complete</p>

                </div>

            </div>

        );

    };



    const renderContent = () => {

        if (loading) return <div className="text-center text-sky-300">Initializing Secure Terminal...</div>;



        if (!currentUser) {

            return (

                 <div className="flex flex-col h-full">

                     <div className="flex-shrink-0 flex flex-col items-center">

                        <p className="text-center text-base mb-2">Scan Agent ID</p>

                        <QrLoginComponent onLogin={handleLogin} />

                        {message && <p className="mt-4 text-sm text-center text-yellow-400">{message}</p>}

                     </div>

                     <div className="flex flex-col flex-grow pt-4">

                        <Leaderboard db={db} isAuthReady={isAuthReady} />

                    </div>

                 </div>

            );

        }

        

        const activePuzzleId = currentUser.activePuzzleId;

        const activePuzzle = activePuzzleId ? puzzles[activePuzzleId] : null;



        if (activePuzzle) {

            return (

                <div className="flex flex-col h-full">

                    <LoggedInHeader />

                    <div className="flex flex-col flex-grow h-full gap-4">

                        <div className="flex-grow">

                            <h3 className="text-xl font-bold text-slate-100">{activePuzzle.title}</h3>

                             <div className="flex gap-4 text-sm text-slate-400 mt-1 border-b border-slate-700 pb-2 mb-4">

                                 <span>Location: <span className="font-semibold text-slate-300">{activePuzzle.location}</span></span>

                                 <span>Difficulty: <span className="font-semibold text-slate-300">{activePuzzle.difficulty}</span></span>

                                 <span>Value: <span className="font-semibold text-yellow-400">{activePuzzle.points - hintsUsed} pts</span></span>

                             </div>

                            <p className="text-lg">{activePuzzle.question}</p>

                            {hintsUsed > 0 && <p className="mt-4 text-cyan-400">Intel: {activePuzzle.hint}</p>}

                        </div>

                        {message && <p className="text-sm text-center text-yellow-400">{message}</p>}

                        <form onSubmit={handlePuzzleSubmit} className="flex gap-2">

                            <input type="text" placeholder="Enter answer..." value={puzzleAnswer} onChange={(e) => setPuzzleAnswer(e.target.value)} className="flex-grow p-2 border bg-slate-800 border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500" />

                            <button type="submit" className="px-4 py-2 font-bold text-white transition-colors bg-sky-600 hover:bg-sky-700">Submit</button>

                        </form>

                        <div className="flex gap-2">

                            <button onClick={() => setHintsUsed(prev => prev + 1)} disabled={hintsUsed > 0} className="px-4 py-2 text-sm font-bold text-white transition-colors bg-blue-600 hover:bg-blue-700 disabled:bg-slate-500">Request Intel (-1 Pt)</button>

                            <button onClick={handleReturnToSelection} className="px-4 py-2 text-sm font-bold text-white transition-colors bg-slate-600 hover:bg-slate-700">Return to Selection</button>

                        </div>

                    </div>

                </div>

            );

        }



        const getDifficultyColor = (difficulty) => {

            if (difficulty === 'Easy') return 'bg-green-700/50 hover:bg-green-600/50';

            if (difficulty === 'Medium') return 'bg-yellow-700/50 hover:bg-yellow-600/50';

            if (difficulty === 'Hard') return 'bg-red-700/50 hover:bg-red-600/50';

            return 'bg-slate-800/50 hover:bg-slate-700/70';

        };



        return (

            <div className="flex flex-col h-full">

                <LoggedInHeader />

                {message && <p className="mb-2 text-sm text-center text-yellow-400">{message}</p>}

                <div className="flex-grow space-y-2">

                    {['Easy', 'Medium', 'Hard'].map(difficulty => (

                        <div key={difficulty}>

                            <h3 className="mb-1 text-sm font-bold text-sky-400">{difficulty} Assignments</h3>

                            <div className="grid grid-cols-3 gap-1">

                                {Object.entries(puzzles).filter(([, p]) => p.difficulty === difficulty).map(([id, puzzle]) => {

                                    const isCompleted = id in currentUser.completedPuzzles;

                                    const isDisabled = isCompleted || currentUser.activePuzzleId;



                                    let buttonClass;

                                    if (isCompleted) {

                                        buttonClass = 'bg-green-900/50';

                                    } else if (isDisabled) {

                                        buttonClass = 'bg-slate-800/30 text-slate-500';

                                    } else {

                                        buttonClass = getDifficultyColor(puzzle.difficulty);

                                    }

                                    

                                    return (

                                        <button 

                                            key={id} 

                                            onClick={() => handlePuzzleSelect(id)} 

                                            disabled={isDisabled} 

                                            className={`relative flex flex-col items-center justify-center px-1 py-0.5 text-center text-white transition-colors rounded-lg ${buttonClass} disabled:cursor-not-allowed overflow-hidden h-16`}

                                        >

                                            {isCompleted ? (

                                                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>

                                            ) : (

                                                <>

                                                    {loadingPuzzleId === id ? <Spinner /> :

                                                        <div className="flex flex-col">

                                                             <span className="text-xs font-bold uppercase text-slate-400">{puzzle.location}</span>

                                                             <span className="text-lg font-bold text-yellow-400">{puzzle.points} PTS</span>

                                                        </div>

                                                    }

                                                </>

                                            )}

                                        </button>

                                    );

                                })}

                            </div>

                        </div>

                    ))}

                </div>

            </div>

        );

    };



    return (

        <div

            className="flex flex-col h-full bg-cover bg-center"

            style={{

                backgroundImage: `linear-gradient(rgba(30, 41, 59, 0.85), rgba(30, 41, 59, 0.85)), url('https://www.vircan.ca/wp-content/uploads/2016/09/CDC.png')`

            }}

        >

            <div className="flex-shrink-0 p-4 border-b border-sky-400/30">

                <h2 className="text-base font-bold text-sky-400">SECURE CDC TERMINAL</h2>

            </div>

            <div className="flex-grow p-4 overflow-y-auto">

                {renderContent()}

            </div>

        </div>

    );

};



// --- Main App Component ---



export default function App() {

    const [db, setDb] = useState(null);

    const [isAuthReady, setIsAuthReady] = useState(false);

    const [currentUser, setCurrentUser] = useState(null);



    // --- Firebase Initialization ---

    useEffect(() => {

        const initializeFirebase = async () => {

            try {

                const firebaseConfig = realFirebaseConfig;

                if (!firebaseConfig) { 

                    console.error("Firebase config not found. Please ensure the environment variables are set.");

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

                });

            } catch (error) {

                console.error("Error initializing Firebase:", error);

            }

        };

        initializeFirebase();

    }, []);



    const initialCountryData = useMemo(() => [

        { name: "United States", code: "us", infected: 425384192, deaths: 106192843 },

        { name: "India", code: "in", infected: 215721834, deaths: 53912477 },

        { name: "Brazil", code: "br", infected: 155109283, deaths: 38945102 },

        { name: "France", code: "fr", infected: 150058219, deaths: 37512993 },

        { name: "Germany", code: "de", infected: 135873401, deaths: 33991284 },

        { name: "United Kingdom", code: "gb", infected: 110432188, deaths: 27601923 },

        { name: "Russia", code: "ru", infected: 90123456, deaths: 22598741 },

        { name: "South Korea", code: "kr", infected: 89987654, deaths: 22487192 },

        { name: "Italy", code: "it", infected: 85321987, deaths: 21330182 },

        { name: "Japan", code: "jp", infected: 45019876, deaths: 11255432 }

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

        <div 

            className="relative p-2 font-sans text-slate-200 min-h-screen sm:p-4"

            style={{

                backgroundImage: `url('https://news.stanford.edu/__data/assets/image/0021/52077/varieties/555w.jpeg')`,

                backgroundSize: 'cover',

                backgroundPosition: 'center',

                backgroundAttachment: 'fixed',

            }}

        >

            <div className="absolute inset-0 bg-slate-900/60 z-0"></div>

            <div className="relative z-10 w-full max-w-screen-2xl mx-auto">

                <header className="flex items-center justify-between mb-4 text-white">

                    <h1 className="text-2xl font-bold md:text-3xl">Project Chimera </h1>

                </header>



                <main className="grid grid-cols-1 gap-4 lg:grid-cols-12">

                    <aside className="flex flex-col p-4 lg:col-span-3 bg-slate-900/70 h-[80vh]">

                        <h2 className="pb-2 mb-4 text-base font-bold border-b text-sky-400 border-sky-400/30">Confirmed Cases by Country</h2>

                        <div className="flex-grow pr-2 -mr-2 overflow-y-auto space-y-4">

                            {countryData.map(country => (

                                <div 

                                    key={country.name} 

                                    className="p-2 text-sm rounded-lg bg-cover bg-center"

                                    style={{

                                        backgroundImage: `linear-gradient(rgba(30, 41, 59, 0.7), rgba(30, 41, 59, 0.7)), url('https://flagcdn.com/w320/${country.code}.png')`

                                    }}

                                >

                                     <div className="flex items-center mb-2">

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



                    <section className="lg:col-span-6 h-[80vh]">

                       <PuzzleAppComponent db={db} isAuthReady={isAuthReady} currentUser={currentUser} setCurrentUser={setCurrentUser} />

                    </section>

                    

                    <aside className="flex flex-col p-4 lg:col-span-3 bg-slate-900/70 h-[80vh]">

                        <div className="flex-shrink-0">

                            <h2 className="pb-2 mb-4 text-base font-bold border-b text-sky-400 border-sky-400/30">Global Status</h2>

                            <div className="mb-4 text-center">

                                <p className="text-lg text-slate-400">Total Confirmed</p>

                                <p className="text-4xl font-bold text-red-500 lg:text-5xl">{formatNumber(globalInfected)}</p>

                            </div>

                             <div className="text-center">

                                <p className="text-lg text-slate-400">Total Deaths</p>

                                <p className="text-4xl font-bold text-slate-200 lg:text-5xl">{formatNumber(globalDeaths)}</p>

                            </div>

                        </div>

                        

                        <div className="flex flex-col flex-grow mt-6 overflow-hidden">

                            <h2 className="flex-shrink-0 pb-2 mb-4 text-base font-bold border-b text-sky-400 border-sky-400/30">Critical Updates</h2>

                            <div className="flex-grow pr-2 -mr-2 overflow-y-auto space-y-3">

                                {tickerFeed.map((item, index) => (

                                    <button 

                                        key={index} 

                                        className="w-full p-2 text-sm text-left transition-colors bg-slate-800/50 hover:bg-slate-700/50"

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

            {selectedUpdate && <UpdateModal update={selectedUpdate} onClose={() => setSelectedUpdate(null)} />}

        </div>

    );

}
