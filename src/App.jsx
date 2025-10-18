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
    'easy-lab': { title: "Basic Contamination", question: "What piece of lab equipment creates a sterile work environment by filtering air?", answer: "laminar flow hood", hint: "It provides a constant flow of clean air.", points: 5, difficulty: "Easy", location: "Laboratory" },
    'easy-or': { title: "Surgical Tools", question: "What sharp instrument is used for making incisions during surgery?", answer: "scalpel", hint: "It's a small, extremely sharp blade.", points: 5, difficulty: "Easy", location: "Operating Room" },
    'easy-patient': { title: "Vital Signs", question: "What is the common term for the device with an inflatable cuff used to measure a patient's blood pressure?", answer: "blood pressure cuff", hint: "The medical term is sphygmomanometer.", points: 5, difficulty: "Easy", location: "Patient Room" },
    'easy-decon': { title: "Neutralizing Agent", question: "What is the process of neutralizing or removing hazardous substances from an area or person?", answer: "decontamination", hint: "The name of the room itself is a clue.", points: 5, difficulty: "Easy", location: "Decontamination Room" },
    'easy-waste': { title: "Biohazard Color", question: "What color is universally used for bags and containers holding biohazardous waste?", answer: "red", hint: "This color often signifies danger or warning.", points: 5, difficulty: "Easy", location: "Hazardous Waste" },
    'easy-security': { title: "Agency Acronym", question: "What does the 'C' in 'CDC' stand for?", answer: "centers", hint: "The full name is Centers for Disease Control and Prevention.", points: 5, difficulty: "Easy", location: "Security Office" },

    // Medium Clues (10 Points)
    'medium-lab': { title: "Genetic Amplification", question: "What technique is used to amplify a small sample of DNA into a larger, testable amount?", answer: "pcr", hint: "Its abbreviation stands for Polymerase Chain Reaction.", points: 10, difficulty: "Medium", location: "Laboratory" },
    'medium-or': { title: "Maintaining Sterility", question: "What is the name of the machine that uses high-pressure steam to sterilize surgical equipment?", answer: "autoclave", hint: "It's essential for preventing post-surgical infections.", points: 10, difficulty: "Medium", location: "Operating Room" },
    'medium-patient': { title: "Common Treatment", question: "A dehydrated patient is often given an IV drip containing what simple fluid?", answer: "saline", hint: "It's a solution of salt in sterile water.", points: 10, difficulty: "Medium", location: "Patient Room" },
    'medium-decon': { title: "Safety Level", question: "What level of biosafety (BSL) is required for working with agents that pose a high risk of aerosol-transmitted infections?", answer: "bsl-4", hint: "It is the highest level of biocontainment.", points: 10, difficulty: "Medium", location: "Decontamination Room" },
    'medium-waste': { title: "Sterilization Method", question: "What is the primary method for sterilizing and disposing of infectious medical waste to render it safe?", answer: "incineration", hint: "This process involves burning at very high temperatures.", points: 10, difficulty: "Medium", location: "Hazardous Waste" },
    'medium-security': { title: "Isolation Protocol", question: "What is the term for the isolation of people or animals who have been exposed to a contagious disease?", answer: "quarantine", hint: "It's a key strategy to prevent further spread.", points: 10, difficulty: "Medium", location: "Security Office" },
    
    // Hard Clues (20 Points)
    'hard-lab': { title: "Virus Identification", question: "What laboratory method uses antibodies to detect the presence of a specific antigen in a patient's sample?", answer: "elisa", hint: "This test's abbreviation stands for enzyme-linked immunosorbent assay.", points: 20, difficulty: "Hard", location: "Laboratory" },
    'hard-or': { title: "Life Support", question: "What machine takes over the function of the heart and lungs during complex open-heart surgery?", answer: "heart-lung machine", hint: "Also known as a cardiopulmonary bypass machine.", points: 20, difficulty: "Hard", location: "Operating Room" },
    'hard-patient': { title: "Symptom Analysis", question: "What is the medical term for the small, pinpoint red spots on the skin caused by minor bleeding, a key symptom of hemorrhagic fevers?", answer: "petechiae", hint: "This symptom indicates bleeding underneath the skin.", points: 20, difficulty: "Hard", location: "Patient Room" },
    'hard-decon': { title: "Gaseous Sterilant", question: "What chemical agent is often used in a gaseous state to sterilize entire rooms and sensitive equipment?", answer: "hydrogen peroxide vapor", hint: "It breaks down into water and oxygen, leaving no toxic residue.", points: 20, difficulty: "Hard", location: "Decontamination Room" },
    'hard-waste': { title: "Needle Disposal", question: "What type of puncture-resistant, sealed container is required for disposing of used needles and scalpels?", answer: "sharps container", hint: "The name describes exactly what it holds.", points: 20, difficulty: "Hard", location: "Hazardous Waste" },
    'hard-security': { title: "Epidemic Investigation", question: "In pandemic response, what is the term for tracing the contacts of an infected individual to identify others who may be exposed?", answer: "contact tracing", hint: "It's a fundamental public health strategy to control outbreaks.", points: 20, difficulty: "Hard", location: "Security Office" }
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
            clearTimeout(inactivityTimerRef
