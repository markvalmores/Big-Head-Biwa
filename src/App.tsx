/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Trophy, User as UserIcon, Play, MousePointer2, RefreshCw, RotateCcw } from 'lucide-react';

// --- Types ---
interface LeaderboardEntry {
  name: string;
  score: number;
  updatedAt: string;
}

// --- Helper to get/create a persistent Player ID ---
const getPlayerId = () => {
  let id = localStorage.getItem('biwa_player_id');
  if (!id) {
    id = 'player_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('biwa_player_id', id);
  }
  return id;
};

export default function App() {
  const [playerId] = useState(getPlayerId());
  const [playerName, setPlayerName] = useState(localStorage.getItem('biwa_player_name') || '');
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [headScale, setHeadScale] = useState(1);
  const [leaderboard, setLeaderboard] = useState<(LeaderboardEntry & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // --- Initial Setup ---
  useEffect(() => {
    const loadExistingScore = async () => {
      try {
        const docRef = doc(db, 'leaderboard', playerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as LeaderboardEntry;
          setScore(data.score);
          setHeadScale(1 + (data.score * 0.05));
        }
      } catch (err) {
        console.error("Error loading score:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingScore();
  }, [playerId]);

  // --- Leaderboard Listener ---
  useEffect(() => {
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        ...(doc.data() as LeaderboardEntry),
        id: doc.id
      }));
      setLeaderboard(entries);
    }, (err) => {
      console.error("Leaderboard error:", err);
    });

    return () => unsubscribe();
  }, []);

  // --- Sync Score to Firestore ---
  const syncScore = async (newScore: number) => {
    if (!playerName) return;

    const userDocRef = doc(db, 'leaderboard', playerId);
    try {
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
        await setDoc(userDocRef, {
          name: playerName,
          score: newScore,
          updatedAt: new Date().toISOString()
        });
      } else {
        const currentData = docSnap.data() as LeaderboardEntry;
        if (newScore > currentData.score) {
          await updateDoc(userDocRef, {
            score: newScore,
            updatedAt: new Date().toISOString(),
            name: playerName
          });
        }
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
  };

  const handleStartGame = () => {
    if (playerName.trim().length > 0) {
      localStorage.setItem('biwa_player_name', playerName);
      setIsGameStarted(true);
    }
  };

  const handleClick = () => {
    const newScore = score + 1;
    setScore(newScore);
    setHeadScale(prev => prev + 0.05);
    syncScore(newScore);
  };

  const handleResetHead = () => {
    setHeadScale(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-sans">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center font-sans text-white overflow-hidden relative flex flex-col"
         style={{ backgroundImage: `url('https://images.steamusercontent.com/ugc/11472047761628136170/68B1245C2D6EC6AA11B6BAE31A8D8B1AA71E4E21/?imw=637&imh=358&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true')` }}>
      
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" />

      <AnimatePresence mode="wait">
        {!isGameStarted ? (
          <motion.div 
            key="name-entry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 flex flex-col items-center justify-center flex-1 p-4 sm:p-6"
          >
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 sm:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
              <div className="mb-4 sm:mb-6 inline-flex p-3 sm:p-4 bg-blue-500/20 rounded-2xl text-blue-400">
                <UserIcon size={32} className="sm:w-12 sm:h-12" />
              </div>
              <h1 className="text-3xl sm:text-5xl font-black mb-2 tracking-tighter text-white">BIG HEAD BIWA</h1>
              <p className="text-white/60 mb-6 sm:mb-8 text-sm sm:text-base">Enter your name to start clicking!</p>
              
              <input 
                type="text" 
                placeholder="Your Name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 sm:py-4 px-4 sm:px-6 mb-4 sm:mb-6 text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center text-white"
                maxLength={20}
              />
              
              <button 
                onClick={handleStartGame}
                disabled={!playerName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 sm:py-4 rounded-xl font-bold text-lg sm:text-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 text-white"
              >
                <Play size={20} className="sm:w-6 sm:h-6" />
                START GAME
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 flex flex-col lg:flex-row flex-1 h-full"
          >
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 bg-black/20 backdrop-blur-md border-b border-white/10">
              <div className="flex items-center gap-2">
                <Trophy className="text-yellow-400" size={20} />
                <span className="font-black text-sm tracking-tight">BIG HEAD BIWA</span>
              </div>
              <button 
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="bg-white/10 p-2 rounded-lg text-white"
              >
                <Trophy size={20} />
              </button>
            </div>

            {/* Game Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
              <div className="absolute top-4 sm:top-8 left-1/2 -translate-x-1/2 text-center z-30">
                <motion.div 
                  key={score}
                  initial={{ scale: 1.2, color: '#60a5fa' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="text-5xl sm:text-7xl font-black drop-shadow-lg text-white"
                >
                  {score}
                </motion.div>
                <p className="text-white/60 uppercase tracking-widest font-bold text-[10px] sm:text-sm">Points</p>
              </div>

              <div className="relative flex flex-col items-center justify-center flex-1 w-full max-h-[60vh] sm:max-h-none">
                <div className="relative flex flex-col items-center scale-75 sm:scale-100">
                  <motion.div
                    animate={{ scale: headScale }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 15,
                      mass: 1
                    }}
                    className="relative z-20 origin-bottom"
                  >
                    <img 
                      src="https://image2url.com/r2/default/images/1775214935850-c517fcbd-02cd-4e3f-b179-8988e2c234c9.jpg"
                      alt="Biwa Head"
                      className="w-32 h-32 sm:w-48 sm:h-48 object-cover rounded-full border-4 border-white shadow-2xl"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  
                  <div className="relative z-10 -mt-2 sm:-mt-4">
                    <img 
                      src="https://image2url.com/r2/default/images/1775214898505-a87b2fae-57f1-4a16-b152-14c952297fbc.jpg"
                      alt="Biwa Body"
                      className="w-28 h-40 sm:w-40 sm:h-56 object-cover rounded-2xl border-4 border-white shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-12 flex flex-col items-center gap-3 sm:gap-4 pb-4 sm:pb-0 z-30">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClick}
                  className="bg-white text-black px-6 py-4 sm:px-8 sm:py-6 rounded-2xl sm:rounded-3xl font-black text-xl sm:text-2xl flex items-center gap-2 sm:gap-3 shadow-2xl hover:bg-blue-50 transition-colors"
                >
                  <MousePointer2 size={24} className="sm:w-8 sm:h-8" />
                  +Big Head Biwa
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleResetHead}
                  className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg flex items-center gap-2 hover:bg-white/20 transition-colors"
                >
                  <RotateCcw size={16} className="sm:w-5 sm:h-5" />
                  Reset Head Size
                </motion.button>
              </div>
            </div>

            <motion.div 
              initial={false}
              animate={{ 
                x: (typeof window !== 'undefined' && window.innerWidth < 1024) 
                  ? (showLeaderboard ? 0 : '100%') 
                  : 0 
              }}
              className="fixed lg:relative top-0 right-0 h-full w-full sm:w-80 lg:w-96 bg-black/80 lg:bg-black/60 backdrop-blur-2xl lg:backdrop-blur-xl border-l border-white/10 p-6 sm:p-8 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0"
            >
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="flex items-center gap-3">
                  <Trophy className="text-yellow-400 sm:w-8 sm:h-8" size={24} />
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">LEADERBOARD</h2>
                </div>
                <button 
                  onClick={() => setShowLeaderboard(false)}
                  className="lg:hidden p-2 text-white/60 hover:text-white"
                >
                  <RefreshCw size={24} className="rotate-45" />
                </button>
              </div>

              <div className="flex-1 space-y-2 sm:space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {leaderboard.map((entry, index) => (
                  <motion.div 
                    key={entry.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${
                      entry.id === playerId 
                        ? 'bg-blue-500/20 border-blue-500/50' 
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg font-bold text-xs sm:text-sm ${
                        index === 0 ? 'bg-yellow-400 text-black' :
                        index === 1 ? 'bg-gray-300 text-black' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-white/10 text-white/60'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-bold truncate max-w-[100px] sm:max-w-[120px] text-sm sm:text-base text-white">{entry.name}</span>
                    </div>
                    <span className="font-black text-lg sm:text-xl text-white">{entry.score}</span>
                  </motion.div>
                ))}
                {leaderboard.length === 0 && (
                  <p className="text-center text-white/40 py-10">No scores yet. Be the first!</p>
                )}
              </div>

              <div className="mt-6 sm:mt-8 flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/10">
                <div>
                  <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-widest mb-1">Playing as</p>
                  <p className="font-bold text-base sm:text-lg truncate max-w-[120px] sm:max-w-[150px] text-white">{playerName}</p>
                </div>
                <button 
                  onClick={() => setIsGameStarted(false)}
                  className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                  title="Change Name"
                >
                  <RefreshCw size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
