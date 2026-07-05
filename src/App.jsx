import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import './index.css';
import strategiesData from './data/strategies.json';
import { calculateCCTP } from './utils/cctp';
import { StockfishEngine } from './engine/stockfish';
import { Peer } from 'peerjs';
import { QRCodeSVG } from 'qrcode.react';

// Custom Chessboard Component with smooth FLIP transitions and inline hover hooks
function CustomChessboard({ 
  position, 
  onSquareClick, 
  onSquareMouseEnter, 
  onSquareMouseLeave, 
  boardOrientation, 
  customSquareStyles, 
  arrows, 
  lastMove 
}) {
  const boardChess = new Chess(position);
  const board = boardChess.board();
  
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayRanks = boardOrientation === 'black' ? [...ranks].reverse() : ranks;
  const displayFiles = boardOrientation === 'black' ? [...files].reverse() : files;

  const [animatedSquare, setAnimatedSquare] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [animate, setAnimate] = useState(false);

  // Map piece types to Wikimedia SVG URLs
  const pieceImages = {
    'wP': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    'wN': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    'wB': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'wR': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'wQ': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    'wK': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    'bP': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    'bN': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    'bB': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'bR': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'bQ': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    'bK': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
  };

  // FLIP transition trigger
  useEffect(() => {
    if (lastMove && lastMove.from && lastMove.to) {
      const fromFile = lastMove.from[0];
      const fromRank = lastMove.from[1];
      const toFile = lastMove.to[0];
      const toRank = lastMove.to[1];

      const fromF = files.indexOf(fromFile);
      const fromR = ranks.indexOf(fromRank);
      const toF = files.indexOf(toFile);
      const toR = ranks.indexOf(toRank);

      const mult = boardOrientation === 'black' ? -1 : 1;
      const offsetX = (fromF - toF) * 100 * mult;
      const offsetY = (fromR - toR) * 100 * mult;

      setOffset({ x: offsetX, y: offsetY });
      setAnimatedSquare(lastMove.to);
      setAnimate(false);

      const timer = setTimeout(() => {
        setAnimate(true);
      }, 25);

      return () => clearTimeout(timer);
    } else {
      setAnimatedSquare(null);
      setAnimate(false);
    }
  }, [lastMove, boardOrientation]);

  return (
    <div className="grid grid-cols-8 grid-rows-8 w-full h-full select-none rounded-lg overflow-hidden border border-slate-700 shadow-2xl">
      {displayRanks.map((rank, rIdx) => {
        const actualR = boardOrientation === 'black' ? 7 - rIdx : rIdx;
        return displayFiles.map((file, fIdx) => {
          const actualC = boardOrientation === 'black' ? 7 - fIdx : fIdx;
          const square = `${file}${rank}`;
          const piece = board[actualR][actualC];
          
          const isDark = (rIdx + fIdx) % 2 === 1;
          const bgClass = isDark ? 'bg-board-dark' : 'bg-board-light';
          
          const customStyle = customSquareStyles[square] || {};
          
          // Render directional paths (Start soft-dashed, End solid-bright)
          let borderClass = '';
          let arrowBg = null;
          
          arrows.forEach(([from, to, color]) => {
            const isStart = square === from;
            const isEnd = square === to;
            
            if (isStart || isEnd) {
              if (color === '#10b981') { // Stockfish Best
                borderClass = isEnd ? 'border-2 border-emerald-500' : 'border-2 border-emerald-500/50 border-dashed';
                arrowBg = isEnd ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.15)';
              } else if (color === '#3b82f6') { // Strategy Path
                borderClass = isEnd ? 'border-2 border-blue-500' : 'border-2 border-blue-500/50 border-dashed';
                arrowBg = isEnd ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.15)';
              } else { // Hover Preview / Highlight
                borderClass = isEnd ? 'border-2 border-yellow-500' : 'border-2 border-yellow-500/50 border-dashed';
                arrowBg = isEnd ? 'rgba(234, 179, 8, 0.35)' : 'rgba(234, 179, 8, 0.15)';
              }
            }
          });

          const isPieceAnimated = animatedSquare === square;

          return (
            <button
              key={square}
              onClick={() => onSquareClick(square)}
              onMouseEnter={() => onSquareMouseEnter && onSquareMouseEnter(square)}
              onMouseLeave={() => onSquareMouseLeave && onSquareMouseLeave()}
              className={`w-full h-full flex items-center justify-center relative focus:outline-none transition-all ${bgClass} ${borderClass}`}
              style={{
                backgroundColor: arrowBg || undefined
              }}
            >
              {/* Highlight overlays (selection or target squares) - NO gradients used */}
              {customStyle.isSelectedSquare && (
                <div className="absolute inset-0 pointer-events-none z-10 bg-yellow-500/35" />
              )}
              {customStyle.isOptionSquare && (
                <div className={`absolute pointer-events-none z-10 flex items-center justify-center ${
                  customStyle.isCapture 
                    ? 'inset-0 border-4 border-red-500/60 bg-red-500/15' 
                    : 'w-4.5 h-4.5 rounded-full bg-blue-500/50'
                }`} />
              )}
              
              {/* Dynamic color-coded check, capture, and threat indicators on chessboard */}
              {customStyle.isCheckTarget && (
                <div className="absolute inset-0 pointer-events-none z-20 border-4 border-red-600 bg-red-600/15" />
              )}
              {customStyle.isCaptureTarget && (
                <div className="absolute inset-0 pointer-events-none z-20 border-4 border-amber-600 bg-amber-600/15" />
              )}
              {customStyle.isThreatTarget && (
                <div className="absolute inset-0 pointer-events-none z-20 border-4 border-purple-600 bg-purple-650/15" />
              )}

              {/* Opponent replies indicators on board (dashed rings inside cell) */}
              {customStyle.isOpponentCheckTarget && (
                <div className="absolute inset-2.5 pointer-events-none z-30 border-2 border-dashed border-red-500 rounded-full" />
              )}
              {customStyle.isOpponentCaptureTarget && (
                <div className="absolute inset-2.5 pointer-events-none z-30 border-2 border-dashed border-amber-500 rounded-full" />
              )}
              {customStyle.isOpponentThreatTarget && (
                <div className="absolute inset-2.5 pointer-events-none z-30 border-2 border-dashed border-purple-500 rounded-full" />
              )}

              {/* Chess piece with animation styles */}
              {piece && (
                <img 
                  src={pieceImages[`${piece.color}${piece.type.toUpperCase()}`]} 
                  alt={`${piece.color}${piece.type}`} 
                  style={isPieceAnimated ? {
                    transform: animate ? 'translate(0, 0)' : `translate(${offset.x}%, ${offset.y}%)`,
                    transition: animate ? 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
                  } : {}}
                  className="w-[85%] h-[85%] object-contain z-10 pointer-events-none transform transition-transform active:scale-90" 
                />
              )}

              {/* Row & Col notations */}
              {fIdx === 0 && (
                <span className={`absolute top-1 left-1 text-[8px] font-extrabold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {rank}
                </span>
              )}
              {rIdx === 7 && (
                <span className={`absolute bottom-1 right-1 text-[8px] font-extrabold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {file}
                </span>
              )}
            </button>
          );
        });
      })}
    </div>
  );
}

function App() {
  // Use persistent Chess object and trigger re-renders via tick update
  const [game] = useState(new Chess());
  const [tick, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  // Theme state initialized from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('chesstrainer_dark_mode') === 'true';
  });

  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copyToast, setCopyToast] = useState(false); // toast for copy peer id feedback

  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState('mine'); // 'mine' or 'opp'

  const [view, setView] = useState('home'); // home, color-select, opponent-strategy-select, black-defense-select, trainer, multiplayer-lobby, simulation-color-select
  const [gameMode, setGameMode] = useState('strategy'); // strategy, ai-coach, multiplayer, local-vs-local, simulation
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [whiteStrategy, setWhiteStrategy] = useState(null); // White's selected opening for Black training
  const [userColor, setUserColor] = useState('w'); // 'w' or 'b'
  const [searchQuery, setSearchQuery] = useState('');
  const [lastMove, setLastMove] = useState(null);

  // Homepage Filters
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, openings, midgames, endgames
  const [sideFilter, setSideFilter] = useState('all'); // all, white, black

  // Click-to-move & Highlight states
  const [selectedSquare, setSelectedSquare] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const [isAnimating, setIsAnimating] = useState(false);

  // Tutor Enabled state loaded from localStorage (defaults to true)
  const [quizEnabled, setQuizEnabled] = useState(() => {
    const saved = localStorage.getItem('chesstrainer_tutor_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null);

  // Metrics Data State loaded from localStorage
  const [metricsData, setMetricsData] = useState(() => {
    const saved = localStorage.getItem('chesstrainer_metrics');
    return saved ? JSON.parse(saved) : {
      stats: { gamesPlayed: 0, movesMade: 0, tutorCorrectAnswers: 0, tutorTotalAnswers: 0 },
      strategies: {}
    };
  });

  // Move options & Engine States
  const [cctpData, setCctpData] = useState({ checks: [], captures: [], threats: [], plans: [] });
  const [hoveredMove, setHoveredMove] = useState(null);
  const [engine, setEngine] = useState(null);
  const [bestMove, setBestMove] = useState(null);
  const [hoveredOpponentCCTP, setHoveredOpponentCCTP] = useState(null);
  // Tap-to-preview state for touch interfaces (replaces hover-only interactions)
  const [selectedMovePreview, setSelectedMovePreview] = useState(null); // move object currently tapped/selected for preview

  // Deviation States
  const [deviated, setDeviated] = useState(false);
  const [deviationMsg, setDeviationMsg] = useState('');

  // PeerJS Multiplayer States
  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [peerTargetId, setPeerTargetId] = useState('');
  const [conn, setConn] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, ready, connected
  const [multiplayerMessages, setMultiplayerMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Mapping of White openings to recommended Black defense strategies
  const recommendedDefenses = {
    'ruy_lopez': ['berlin_defense', 'schliemann_defense', 'marshall_attack', 'steinitz_defense'],
    'italian_game': ['two_knights_defense'],
    'queen_s_gambit': ['slav_defense', 'semi_slav_defense', 'queen_s_gambit_accepted', 'queen_s_gambit_declined', 'albin_counter_gambit', 'chigorin_defense']
  };

  // Helper to retrieve recommended White openings for a chosen Black defense
  const getRecommendedWhiteOpenings = (blackStrategyId) => {
    const whiteOpenings = strategiesData.openings.filter(op => op.color === 'white');
    const matched = [];
    
    for (const [whiteId, blackIds] of Object.entries(recommendedDefenses)) {
      if (blackIds.includes(blackStrategyId)) {
        matched.push(whiteId);
      }
    }

    // Fallback based on move dynamics
    const blackOp = strategiesData.openings.find(op => op.id === blackStrategyId);
    if (blackOp && blackOp.lines?.[0]?.moves) {
      const firstMoves = blackOp.lines[0].moves;
      if (firstMoves.includes('c5') || firstMoves.includes('e6') || firstMoves.includes('c6') || firstMoves.includes('d5')) {
        whiteOpenings.forEach(op => {
          if (op.lines?.[0]?.moves?.[0] === 'e4' && !matched.includes(op.id)) {
            matched.push(op.id);
          }
        });
      } else if (firstMoves.includes('Nf6') || firstMoves.includes('g6') || firstMoves.includes('d5') || firstMoves.includes('f5')) {
        whiteOpenings.forEach(op => {
          if (op.lines?.[0]?.moves?.[0] === 'd4' && !matched.includes(op.id)) {
            matched.push(op.id);
          }
        });
      }
    }

    return matched;
  };

  // Process and combine all strategies for the homepage dashboard
  const allStrategies = [
    ...(strategiesData.openings || []).map(item => ({ ...item, category: 'openings' })),
    ...(strategiesData.midgames || []).map(item => ({ ...item, category: 'midgames' })),
    ...(strategiesData.endgames || []).map(item => ({ ...item, category: 'endgames' }))
  ];

  // Filter strategies based on homepage controls
  const filteredStrategies = allStrategies.filter(item => {
    // 1. Category Filter
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

    // 2. Side Filter
    if (sideFilter !== 'all') {
      if (item.category === 'openings' && item.color !== sideFilter) return false;
    }

    // 3. Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatch = item.name.toLowerCase().includes(query);
      const descMatch = item.description.toLowerCase().includes(query);
      const categoryMatch = item.category.toLowerCase().includes(query);
      if (!nameMatch && !descMatch && !categoryMatch) return false;
    }

    return true;
  });

  // Initialize Stockfish
  useEffect(() => {
    const sf = new StockfishEngine();
    setEngine(sf);
    return () => sf.terminate();
  }, []);

  // On mount: read ?peer= URL param and pre-fill peerTargetId for auto-connect via QR scan
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const peerParam = params.get('peer');
    if (peerParam) {
      setPeerTargetId(peerParam);
      // Automatically open the multiplayer lobby when landing via QR link
      setGameMode('multiplayer');
      setView('multiplayer-lobby');
      // Initialize PeerJS for this guest (so they can connect to the host)
      setConnectionStatus('connecting');
      const p = new Peer();
      p.on('open', (id) => {
        setPeerId(id);
        setConnectionStatus('ready');
      });
      p.on('connection', (incomingConn) => {
        setUserColor('w');
        incomingConn.on('open', () => {
          setConn(incomingConn);
          setConnectionStatus('connected');
          setMultiplayerMessages([{ sender: 'system', text: "Friend connected! You are White. Make your first move." }]);
          game.reset();
          setLastMove(null);
          forceUpdate();
          setView('trainer');
        });
        setupConnectionListeners(incomingConn);
      });
      p.on('error', () => setConnectionStatus('disconnected'));
      setPeer(p);
    }
  }, []);

  // Reset states on strategy change
  useEffect(() => {
    setDeviated(false);
    setDeviationMsg('');
    setSelectedSquare('');
    setOptionSquares({});
    setLastMove(null);
    setIsAnimating(false);
    setActiveQuestion(null);
    setQuizFeedback(null);
  }, [selectedStrategy]);

  // Calculate move options and run engine evaluation on every move
  useEffect(() => {
    if (view === 'trainer') {
      const fen = game.fen();
      const currentCCTP = calculateCCTP(fen);
      setCctpData(currentCCTP);
      setHoveredOpponentCCTP(null); // Clear preview

      if (engine) {
        engine.onBestMove = (uci) => {
          const moves = game.moves({ verbose: true });
          const matched = moves.find(m => m.from === uci.slice(0, 2) && m.to === uci.slice(2, 4));
          if (matched) {
            setBestMove(matched);
          }
        };
        engine.evaluate(fen);
      }
    }
  }, [game, tick, engine, view]);

  // Web Speech API text-to-speech helper
  const speakText = (text) => {
    if (speechEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Refine voice notation pronunciations
      const cleaned = text
        .replace(/(\w)(\d)/g, '$1 $2') // e.g. e4 -> e 4
        .replace(/➔/g, 'to')
        .replace(/→/g, 'to');

      const utterance = new SpeechSynthesisUtterance(cleaned);
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en-'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      window.speechSynthesis.speak(utterance);
    }
  };

  // Automated Opponent / Trainer response move
  useEffect(() => {
    // PAUSE opponent response while quiz is active
    if (activeQuestion || quizFeedback) return;

    // In local vs local or simulation, there's no automated opponent - both players click manually
    if (gameMode === 'local-vs-local' || gameMode === 'simulation') return;

    if (view === 'trainer' && game.turn() !== userColor && !game.isGameOver()) {
      const timer = setTimeout(() => {
        let movePlayed = false;
        
        // 1. In AI Coach mode: opponent autoplay always plays the Stockfish best move
        if (gameMode === 'ai-coach' && bestMove) {
          makeMove(bestMove, true);
          movePlayed = true;
        }

        // 2. In Strategy Mode during teaching phase: opponent plays a RANDOM legal move (not the strategy line)
        if (!movePlayed && gameMode === 'strategy' && !deviated && selectedStrategy?.lines?.[0]) {
          const lineMoves = selectedStrategy.lines[0].moves;
          const history = game.history();
          
          if (history.length < lineMoves.length) {
            // Still inside the strategy teaching phase - play a random legal move
            const legalMoves = game.moves({ verbose: true });
            if (legalMoves.length > 0) {
              const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
              makeMove(randomMove, true);
              movePlayed = true;
            }
          }
        }

        // 3. In Strategy Mode: after strategy line is exhausted, switch to Stockfish AI
        if (!movePlayed && gameMode === 'strategy' && bestMove) {
          if (!deviated && selectedStrategy?.lines?.[0]) {
            const history = game.history();
            const lineMoves = selectedStrategy.lines[0].moves;
            if (history.length >= lineMoves.length) {
              setDeviated(true);
              setDeviationMsg(`Strategy line completed! AI engine is now guiding the rest of the game.`);
            }
          }
          makeMove(bestMove, true);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [game, tick, userColor, view, selectedStrategy, bestMove, deviated, activeQuestion, quizFeedback, gameMode]);

  // PeerJS setup and incoming connection helpers
  const startMultiplayer = () => {
    setGameMode('multiplayer');
    setView('multiplayer-lobby');
    
    if (!peer) {
      setConnectionStatus('connecting');
      const p = new Peer();
      p.on('open', (id) => {
        setPeerId(id);
        setConnectionStatus('ready');
      });
      p.on('connection', (incomingConn) => {
        // We are the host! Play White.
        setUserColor('w');
        incomingConn.on('open', () => {
          setConn(incomingConn);
          setConnectionStatus('connected');
          setMultiplayerMessages([{ sender: 'system', text: "Friend connected! You are White. Make your first move." }]);
          game.reset();
          setLastMove(null);
          forceUpdate();
          setView('trainer');
        });
        setupConnectionListeners(incomingConn);
      });
      p.on('error', (err) => {
        console.error("PeerJS Connection error:", err);
        alert("PeerJS connection failed: " + err.message);
        setConnectionStatus('disconnected');
      });
      setPeer(p);
    } else {
      setConnectionStatus('ready');
    }
  };

  const connectToFriend = () => {
    if (!peer || !peerTargetId) {
      alert("Please enter a valid target Friend ID.");
      return;
    }
    setConnectionStatus('connecting');
    const outgoingConn = peer.connect(peerTargetId);

    outgoingConn.on('open', () => {
      setConn(outgoingConn);
      setConnectionStatus('connected');
      // Guest plays Black.
      setUserColor('b');
      setMultiplayerMessages([{ sender: 'system', text: "Connected to friend! You are Black. Waiting for White to move." }]);
      game.reset();
      setLastMove(null);
      forceUpdate();
      setView('trainer');
    });
    setupConnectionListeners(outgoingConn);
  };

  const setupConnectionListeners = (connection) => {
    connection.on('data', (data) => {
      if (data.type === 'move') {
        game.move(data.move);
        setLastMove(data.move);
        forceUpdate();
      } else if (data.type === 'chat') {
        setMultiplayerMessages(prev => [...prev, { sender: 'opponent', text: data.text }]);
      } else if (data.type === 'restart') {
        game.reset();
        setLastMove(null);
        setDeviated(false);
        setMultiplayerMessages(prev => [...prev, { sender: 'system', text: "Game reset by opponent." }]);
        forceUpdate();
      }
    });

    connection.on('close', () => {
      alert("Multiplayer peer disconnected.");
      setConnectionStatus('disconnected');
      setConn(null);
      setView('home');
    });

    connection.on('error', (err) => {
      console.error(err);
      alert("PeerJS data channel error: " + err.message);
    });
  };

  const sendPeerChat = () => {
    if (!chatInput.trim() || !conn || !conn.open) return;
    conn.send({ type: 'chat', text: chatInput });
    setMultiplayerMessages(prev => [...prev, { sender: 'me', text: chatInput }]);
    setChatInput('');
  };

  const requestRestartMultiplayer = () => {
    if (!conn || !conn.open) return;
    conn.send({ type: 'restart' });
    game.reset();
    setLastMove(null);
    setDeviated(false);
    setMultiplayerMessages(prev => [...prev, { sender: 'system', text: "You reset the game." }]);
    forceUpdate();
  };

  // Generate interactive educational questions based on CCTP priority choice in the current position
  const triggerCurrentCctpQuiz = () => {
    // If a quiz is already active or feedback is shown, don't override it
    if (activeQuestion) return;

    const currentCctp = calculateCCTP(game.fen());
    
    let correctIdx = 3; // Default is Plan
    let category = 'Plan / Center';
    let explanation = '';
    
    if (currentCctp.checks.length > 0) {
      correctIdx = 0;
      category = 'Checks';
      const sample = currentCctp.checks[0].san;
      explanation = `There is an active check available in this position (such as ${sample}). You should always analyze checks first to see if they force a tactical win or checkmate.`;
    } else if (currentCctp.captures.length > 0) {
      correctIdx = 1;
      category = 'Captures';
      const sample = currentCctp.captures[0].san;
      explanation = `There are no checks, but there is a capture available (such as ${sample}). Material wins and piece trades are highly critical to look for next.`;
    } else if (currentCctp.threats.length > 0) {
      correctIdx = 2;
      category = 'Threats';
      const sample = currentCctp.threats[0].san;
      explanation = `There are no checks or captures, but you have an active threat (such as ${sample}) to attack an undefended or valuable piece. Look for these to create pressure.`;
    } else {
      correctIdx = 3;
      category = 'Plans / Center';
      explanation = `There are no immediate checks, captures, or threats available. In this quiet position, focus on plans: control the center, develop inactive pieces, or initiate a pawn break.`;
    }

    const questionText = `It is your turn. According to CCTP priorities, what is the highest priority category you should look for in this position?`;
    
    const options = [
      "Checks (C) - Attacks on the opponent King",
      "Captures (C) - Material wins or piece trades",
      "Threats (T) - Attacks on undefended or valuable pieces",
      "Plans / Center (P) - Development, space, or center control"
    ];

    setActiveQuestion({
      question: questionText,
      options: options,
      correctIdx: correctIdx,
      explanation: explanation
    });

    speakText(questionText);
  };

  const handleAnswer = (idx) => {
    const isCorrect = idx === activeQuestion.correctIdx;
    const textStr = isCorrect 
      ? `Correct! ${activeQuestion.explanation}` 
      : `Incorrect. ${activeQuestion.explanation}`;

    setQuizFeedback({
      isCorrect: isCorrect,
      text: textStr
    });

    speakText(textStr);

    // Save metrics
    const current = { ...metricsData };
    current.stats.tutorTotalAnswers += 1;
    if (isCorrect) {
      current.stats.tutorCorrectAnswers += 1;
    }
    localStorage.setItem('chesstrainer_metrics', JSON.stringify(current));
    setMetricsData(current);
  };

  const handleContinue = () => {
    setActiveQuestion(null);
    setQuizFeedback(null);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Automatically trigger CCTP search priority quiz at the start of the user's turn
  useEffect(() => {
    const noQuizModes = ['multiplayer', 'local-vs-local', 'simulation'];
    if (view === 'trainer' && !noQuizModes.includes(gameMode) && quizEnabled && game.turn() === userColor && !game.isGameOver()) {
      const timer = setTimeout(() => {
        triggerCurrentCctpQuiz();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [game, tick, userColor, view, quizEnabled, gameMode]);

  // Trigger confetti celebration when checkmate occurs in any mode
  useEffect(() => {
    if (view === 'trainer' && game.isCheckmate()) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4500);
      return () => clearTimeout(t);
    }
  }, [game, tick, view]);

  // Metrics savers
  const saveStrategyMetric = (strategy) => {
    if (!strategy) return;
    const current = { ...metricsData };
    current.stats.gamesPlayed += 1;
    
    const sId = strategy.id || 'ai-coach';
    if (!current.strategies[sId]) {
      current.strategies[sId] = {
        name: strategy.name,
        category: strategy.category || 'ai-coach',
        timesTrained: 0,
        lastTrained: new Date().toLocaleDateString()
      };
    }
    current.strategies[sId].timesTrained += 1;
    current.strategies[sId].lastTrained = new Date().toLocaleDateString();
    
    localStorage.setItem('chesstrainer_metrics', JSON.stringify(current));
    setMetricsData(current);
  };

  const handleResetData = () => {
    localStorage.removeItem('chesstrainer_metrics');
    localStorage.removeItem('chesstrainer_tutor_enabled');
    localStorage.removeItem('chesstrainer_dark_mode');
    
    // Reset state
    setQuizEnabled(true);
    setDarkMode(false);
    setMetricsData({
      stats: { gamesPlayed: 0, movesMade: 0, tutorCorrectAnswers: 0, tutorTotalAnswers: 0 },
      strategies: {}
    });

    setShowResetSuccess(true);
    setTimeout(() => {
      setShowResetSuccess(false);
    }, 2000);
  };

  const makeMove = (move, isOpponent = false) => {
    try {
      setIsAnimating(true);
      
      // Clear active question/feedback as soon as user plays
      setActiveQuestion(null);
      setQuizFeedback(null);

      // Check for deviation before executing
      if (!deviated && gameMode === 'strategy' && selectedStrategy && selectedStrategy.lines && selectedStrategy.lines[0]) {
        const lineMoves = selectedStrategy.lines[0].moves;
        const history = game.history();
        const expectedMoveSan = lineMoves[history.length];

        if (expectedMoveSan && move.san !== expectedMoveSan) {
          setDeviated(true);
          setDeviationMsg(`Deviation: You played ${move.san} instead of ${expectedMoveSan}. Live engine analysis is now active.`);
        }
      }

      game.move({
        from: move.from,
        to: move.to,
        promotion: 'q',
      });
      
      setLastMove(move);
      forceUpdate();
      setSelectedSquare('');
      setOptionSquares({});
      setHoveredMove(null);
      
      // Save move count metrics
      if (gameMode !== 'multiplayer') {
        const current = { ...metricsData };
        current.stats.movesMade += 1;
        localStorage.setItem('chesstrainer_metrics', JSON.stringify(current));
        setMetricsData(current);
      }

      // If multiplayer, send move to peer
      if (gameMode === 'multiplayer' && !isOpponent && conn && conn.open) {
        conn.send({
          type: 'move',
          move: {
            from: move.from,
            to: move.to
          }
        });
      }

      // Unlock board interactions after transition completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 350);
    } catch (e) {
      setIsAnimating(false);
      console.error("Invalid move attempted:", e);
    }
  };

  // Click-to-move & highlighted move options
  const getMoveOptions = (square) => {
    const moves = game.moves({
      square: square,
      verbose: true
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return;
    }

    const newSquares = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        isOptionSquare: true,
        isCapture: !!game.get(move.to)
      };
    });
    newSquares[square] = {
      isSelectedSquare: true
    };
    setOptionSquares(newSquares);
  };

  const onSquareClick = (square) => {
    // If a move transition or quiz modal is active, ignore clicks
    if (isAnimating || activeQuestion) {
      return;
    }

    // In local-vs-local and simulation modes, both sides can always move freely
    const isLocalMode = gameMode === 'local-vs-local' || gameMode === 'simulation';
    const activeColor = isLocalMode ? game.turn() : userColor;

    // Only allow moving on player's correct turn
    if (!isLocalMode && game.turn() !== userColor) {
      return;
    }

    if (!selectedSquare) {
      const piece = game.get(square);
      if (piece && piece.color === activeColor) {
        setSelectedSquare(square);
        getMoveOptions(square);
      }
    } else {
      const moves = game.moves({
        square: selectedSquare,
        verbose: true
      });
      const foundMove = moves.find((m) => m.to === square);

      if (foundMove) {
        makeMove(foundMove);
      } else {
        const piece = game.get(square);
        if (piece && piece.color === activeColor) {
          setSelectedSquare(square);
          getMoveOptions(square);
        } else {
          setSelectedSquare('');
          setOptionSquares({});
        }
      }
    }
  };

  // Compute preview for opponent replies when hovering over a move (or tapping on touch)
  const handleMouseEnterMove = (move) => {
    if (isAnimating || activeQuestion) return;
    setHoveredMove(move);
    setSelectedMovePreview(move);
    
    const tempGame = new Chess(game.fen());
    try {
      tempGame.move({ from: move.from, to: move.to, promotion: 'q' });
      const opponentCCTP = calculateCCTP(tempGame.fen());
      setHoveredOpponentCCTP({
        moveSan: move.san,
        ...opponentCCTP
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMouseLeaveMove = () => {
    // On mouse devices: clear on leave. On touch: keep selected until tapped again.
    setHoveredMove(null);
    // Don't clear hoveredOpponentCCTP here - it stays until next tap/hover or board click
  };

  // Tap handler for touch interfaces - toggle preview on/off
  const handleTapMove = (move) => {
    if (isAnimating || activeQuestion) return;
    if (selectedMovePreview && selectedMovePreview.from === move.from && selectedMovePreview.to === move.to) {
      // Tapping the same move again clears the preview
      setSelectedMovePreview(null);
      setHoveredMove(null);
      setHoveredOpponentCCTP(null);
    } else {
      handleMouseEnterMove(move);
    }
  };

  // Mouse hover trigger directly on chessboard squares (to update right-pane blunder check)
  const onSquareMouseEnter = (square) => {
    if (isAnimating || activeQuestion) return;
    if (selectedSquare) {
      const moves = game.moves({
        square: selectedSquare,
        verbose: true
      });
      const foundMove = moves.find((m) => m.to === square);
      if (foundMove) {
        handleMouseEnterMove(foundMove);
      }
    }
  };

  const onSquareMouseLeave = () => {
    setHoveredMove(null);
    // Keep selectedMovePreview active for touch users
  };

  // Selection Card Router
  const handleSelectStrategy = (item) => {
    setSelectedStrategy(item);
    setGameMode('strategy');
    saveStrategyMetric(item);
    
    if (item.category === 'openings') {
      if (item.color === 'white') {
        // 1. If it's White opening: play as White immediately (no prompt needed!)
        setUserColor('w');
        game.load(item.startingFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        forceUpdate();
        setView('trainer');
      } else { // 'black'
        // 2. If it's Black opening: play as Black. Ask which White opening White plays (Path A)
        setUserColor('b');
        setView('opponent-strategy-select');
      }
    } else {
      // 3. Midgame / Endgames: ask for color choice
      setView('color-select');
    }
  };

  const startAICoachMode = () => {
    setGameMode('ai-coach');
    const strat = {
      name: "AI Chess Coach",
      description: "Practice a full game of chess with live engine analysis and move categories coaching."
    };
    setSelectedStrategy(strat);
    saveStrategyMetric(strat);
    setView('color-select');
  };

  const startLocalVsLocal = () => {
    setGameMode('local-vs-local');
    const strat = { name: "Local vs Local", description: "Two players take turns on the same device. No AI recommendations." };
    setSelectedStrategy(strat);
    game.reset();
    setUserColor('w'); // White always starts; both sides can move
    setLastMove(null);
    setDeviated(false);
    setDeviationMsg('');
    forceUpdate();
    setView('trainer');
  };

  const startSimulation = () => {
    setGameMode('simulation');
    const strat = { name: "Simulation", description: "Choose a side and simulate a local match. No AI recommendations." };
    setSelectedStrategy(strat);
    setView('simulation-color-select');
  };

  // Compute arrows for chessboard
  const getArrows = () => {
    // Hide arrows completely in P2P multiplayer match
    if (gameMode === 'multiplayer') {
      return [];
    }

    const arrows = [];
    
    if (hoveredMove) {
      arrows.push([hoveredMove.from, hoveredMove.to, '#eab308']); // Yellow for hover
      return arrows;
    }

    if (bestMove && game.turn() === userColor) {
      arrows.push([bestMove.from, bestMove.to, '#10b981']); // Green for Stockfish best move
    }

    if (gameMode === 'strategy' && selectedStrategy && selectedStrategy.lines && selectedStrategy.lines[0]) {
      const temp = new Chess(selectedStrategy.startingFen || undefined);
      const lineMoves = selectedStrategy.lines[0].moves;
      const history = game.history();
      let match = true;
      
      for (let i = 0; i < history.length; i++) {
        try {
          temp.move(history[i]);
        } catch (e) {
          match = false;
          break;
        }
      }

      if (match && history.length < lineMoves.length) {
        const nextMoveSan = lineMoves[history.length];
        try {
          const nextMove = temp.move(nextMoveSan);
          if (!bestMove || bestMove.from !== nextMove.from || bestMove.to !== nextMove.to) {
            arrows.push([nextMove.from, nextMove.to, '#3b82f6']); // Blue for strategy line
          }
        } catch (e) {}
      }
    }

    return arrows;
  };

  // Build custom square styles incorporating color coded check, capture and threat indicators when hovered
  const getCustomSquareStyles = () => {
    const styles = { ...optionSquares };

    // If a move is hovered, highlight its path and targets
    if (hoveredMove) {
      styles[hoveredMove.from] = {
        ...styles[hoveredMove.from],
        isSelectedSquare: true
      };
      styles[hoveredMove.to] = {
        ...styles[hoveredMove.to],
        isSelectedSquare: true
      };

      // 1. Check Target: if move checks the King, find the opponent's King and highlight it in Red
      if (hoveredMove.san.includes('+') || hoveredMove.san.includes('#')) {
        const tempGame = new Chess(game.fen());
        try {
          tempGame.move({ from: hoveredMove.from, to: hoveredMove.to, promotion: 'q' });
          const oppColor = tempGame.turn();
          const board = tempGame.board();
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const p = board[r][c];
              if (p && p.type === 'k' && p.color === oppColor) {
                const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
                const kSq = `${files[c]}${ranks[r]}`;
                styles[kSq] = {
                  ...styles[kSq],
                  isCheckTarget: true
                };
              }
            }
          }
        } catch (e) {}
      }

      // 2. Capture Target: if move captures a piece, highlight the capture square in Amber
      if (hoveredMove.captured) {
        styles[hoveredMove.to] = {
          ...styles[hoveredMove.to],
          isCaptureTarget: true
        };
      }

      // 3. Threat Target: if it has a threatenedSquare, highlight it in Purple
      if (hoveredMove.threatenedSquare) {
        styles[hoveredMove.threatenedSquare] = {
          ...styles[hoveredMove.threatenedSquare],
          isThreatTarget: true
        };
      }
    }

    // If opponent replies preview is active, color-code all opponent check, capture, and threat replies on the board
    if (hoveredOpponentCCTP) {
      hoveredOpponentCCTP.checks.forEach(m => {
        styles[m.to] = {
          ...styles[m.to],
          isOpponentCheckTarget: true
        };
      });
      hoveredOpponentCCTP.captures.forEach(m => {
        styles[m.to] = {
          ...styles[m.to],
          isOpponentCaptureTarget: true
        };
      });
      hoveredOpponentCCTP.threats.forEach(m => {
        styles[m.to] = {
          ...styles[m.to],
          isOpponentThreatTarget: true
        };
      });
    }

    return styles;
  };

  // Build the dedicated "Recommended Moves" array for the user's turn
  // In strategy mode: only show AI recommendations AFTER the strategy line is fully taught
  const strategyLineMoves = (gameMode === 'strategy' && selectedStrategy?.lines?.[0]?.moves) || [];
  const strategyTaught = strategyLineMoves.length > 0 && game.history().length >= strategyLineMoves.length;
  const recommendedMoves = [];
  
  if (game.turn() === userColor) {
    // Show AI best move only if: not in strategy mode OR strategy is fully taught
    if (bestMove && (gameMode !== 'strategy' || strategyTaught || deviated)) {
      recommendedMoves.push({
        ...bestMove,
        type: 'best'
      });
    }

    // Show the strategy line's next step while still teaching (not yet deviated)
    if (gameMode === 'strategy' && selectedStrategy?.lines?.[0] && !deviated && !strategyTaught) {
      const temp = new Chess(selectedStrategy.startingFen || undefined);
      const history = game.history();
      let match = true;
      
      for (let i = 0; i < history.length; i++) {
        try {
          temp.move(history[i]);
        } catch (e) {
          match = false;
          break;
        }
      }

      if (match && history.length < strategyLineMoves.length) {
        const nextMoveSan = strategyLineMoves[history.length];
        try {
          const nextMove = temp.move(nextMoveSan);
          const existingIdx = recommendedMoves.findIndex(m => m.from === nextMove.from && m.to === nextMove.to);
          if (existingIdx !== -1) {
            recommendedMoves[existingIdx].type = 'both';
          } else {
            recommendedMoves.push({
              ...nextMove,
              type: 'strategy'
            });
          }
        } catch (e) {}
      }
    }
  }

  // Helper to filter out recommended moves from general lists
  const isRecommended = (m) => recommendedMoves.some(rm => rm.from === m.from && rm.to === m.to);
  const filteredChecks = cctpData.checks.filter(m => !isRecommended(m));
  const filteredCaptures = cctpData.captures.filter(m => !isRecommended(m));
  const filteredThreats = cctpData.threats.filter(m => !isRecommended(m));
  const filteredPlans = cctpData.plans.filter(m => !isRecommended(m));

  const renderRecommendedSection = () => {
    if (recommendedMoves.length === 0) return null;
    const pieceNames = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };
    
    return (
      <div className="mb-6 bg-slate-955/30 border border-emerald-500/10 p-3.5 rounded-xl animate-fade-in">
        <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5 text-emerald-555 dark:text-emerald-400 flex items-center gap-1.5 animate-fade-in">
          <span>⭐</span> Recommended Options
        </h3>
        <div className="flex flex-col gap-2">
          {recommendedMoves.map((move, idx) => {
            let friendlyText = '';
            if (move.san === 'O-O') {
              friendlyText = 'Castle Kingside';
            } else if (move.san === 'O-O-O') {
              friendlyText = 'Castle Queenside';
            } else if (move.captured) {
              friendlyText = `Capture ${pieceNames[move.captured] || 'piece'} on ${move.to}`;
            } else {
              friendlyText = `Move ${pieceNames[move.piece] || 'Pawn'} to ${move.to}`;
            }

            let badgeText = '';
            let badgeBg = '';
            if (move.type === 'best') {
              badgeText = 'Best';
              badgeBg = 'bg-emerald-500 text-slate-900';
            } else if (move.type === 'strategy') {
              badgeText = 'Strategy';
              badgeBg = 'bg-blue-600 text-white';
            } else {
              badgeText = 'Best & Strategy';
              badgeBg = 'bg-emerald-600 text-white';
            }

            const isSelected = selectedMovePreview?.from === move.from && selectedMovePreview?.to === move.to;

            return (
              <button
                key={idx}
                disabled={isAnimating}
                onClick={() => makeMove(move)}
                onMouseEnter={() => handleMouseEnterMove(move)}
                onMouseLeave={handleMouseLeaveMove}
                className={`p-2 px-3 rounded-lg text-left border transition-all flex justify-between items-center bg-slate-800 text-slate-100 cursor-pointer ${
                  isSelected ? 'border-emerald-400/60 ring-1 ring-emerald-500/30' : 'border-white/5 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold text-xs leading-normal">{friendlyText}</span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">{move.from} → {move.to} ({move.san})</span>
                </div>
                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                  {/* Touch preview button */}
                  <button
                    onPointerDown={(e) => { e.stopPropagation(); handleTapMove(move); }}
                    className="lg:hidden p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[9px] border border-white/10 cursor-pointer"
                    title="Preview opponent reply"
                  >
                    {isSelected ? '✕' : '👁'}
                  </button>
                  <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-extrabold ${badgeBg}`}>
                    {badgeText}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMoveList = (title, moves, colorClass) => {
    if (moves.length === 0) return null;
    const pieceNames = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

    return (
      <div className="mb-6 animate-fade-in">
        <h3 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${colorClass}`}>{title}</h3>
        <div className="flex flex-col gap-2">
          {moves.map((move, idx) => {
            let friendlyText = '';
            if (move.san === 'O-O') {
              friendlyText = 'Castle Kingside';
            } else if (move.san === 'O-O-O') {
              friendlyText = 'Castle Queenside';
            } else if (move.captured) {
              friendlyText = `Capture ${pieceNames[move.captured] || 'piece'} on ${move.to}`;
            } else {
              friendlyText = `Move ${pieceNames[move.piece] || 'Pawn'} to ${move.to}`;
            }

            const isSelected = selectedMovePreview?.from === move.from && selectedMovePreview?.to === move.to;

            return (
              <button
                key={idx}
                disabled={isAnimating}
                onClick={() => makeMove(move)}
                onMouseEnter={() => handleMouseEnterMove(move)}
                onMouseLeave={handleMouseLeaveMove}
                className={`p-2 px-3 rounded text-left border transition-all flex justify-between items-center bg-slate-800 text-slate-100 ${
                  isAnimating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  isSelected ? 'border-blue-400/60 ring-1 ring-blue-500/20' : 'border-white/5 hover:border-slate-600'
                }`}
              >
                <div className="flex flex-col flex-1">
                  <span className="font-semibold text-xs leading-normal">{friendlyText}</span>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">{move.from} → {move.to} ({move.san})</span>
                </div>
                {/* Touch preview button (visible on tablet/mobile, hidden on desktop hover) */}
                <button
                  onPointerDown={(e) => { e.stopPropagation(); handleTapMove(move); }}
                  className="lg:hidden p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[9px] border border-white/10 ml-2 cursor-pointer shrink-0"
                  title="Preview opponent reply"
                >
                  {isSelected ? '✕' : '👁'}
                </button>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render the full strategy line as a step-by-step tree with Your move / Opponent can play nodes
  const renderStrategyTree = () => {
    if (gameMode !== 'strategy' || !selectedStrategy?.lines?.[0]?.moves) return null;
    const lineMoves = selectedStrategy.lines[0].moves;
    const history = game.history();
    const currentStep = history.length;

    // Build paired steps: [{ yourMove, opponentMoves }]
    const steps = [];
    const tempGame = new Chess(selectedStrategy.startingFen || undefined);
    const isUserWhite = userColor === 'w';

    for (let i = 0; i < lineMoves.length; i++) {
      const move = lineMoves[i];
      // Even indices are White moves, odd are Black moves
      const isWhiteMove = i % 2 === 0;
      const isUserMove = (isWhiteMove && isUserWhite) || (!isWhiteMove && !isUserWhite);
      const isDone = i < currentStep;
      const isCurrent = i === currentStep;

      let sanMove = null;
      try {
        const result = tempGame.move(move);
        sanMove = result.san;
      } catch (e) {
        break;
      }

      steps.push({ idx: i, san: sanMove || move, isUserMove, isDone, isCurrent });
    }

    return (
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <span>📋</span> Strategy Roadmap
          </h3>
          <span className="text-[9px] text-slate-500 font-mono">{Math.min(currentStep, lineMoves.length)}/{lineMoves.length} steps</span>
        </div>
        <div className="relative flex flex-col gap-1.5 pl-3 border-l-2 border-slate-700/60">
          {steps.map((step) => (
            <div
              key={step.idx}
              className={`relative flex items-start gap-2.5 p-2 rounded-lg transition-all ${
                step.isDone
                  ? 'bg-slate-800/30 opacity-60'
                  : step.isCurrent
                  ? step.isUserMove
                    ? 'bg-blue-500/10 border border-blue-500/30 shadow-sm'
                    : 'bg-amber-500/10 border border-amber-500/30 shadow-sm'
                  : 'bg-slate-800/10'
              }`}
            >
              {/* Step dot on the timeline */}
              <div className={`absolute -left-[1.15rem] top-3 w-3 h-3 rounded-full border-2 shrink-0 ${
                step.isDone
                  ? 'bg-emerald-500 border-emerald-400'
                  : step.isCurrent
                  ? step.isUserMove
                    ? 'bg-blue-500 border-blue-300 animate-pulse'
                    : 'bg-amber-500 border-amber-300 animate-pulse'
                  : 'bg-slate-700 border-slate-600'
              }`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    step.isUserMove
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {step.isUserMove ? 'You' : 'Opponent'}
                  </span>
                  <span className="text-[9px] text-slate-500">Step {step.idx + 1}</span>
                  {step.isDone && <span className="text-[9px] text-emerald-500">✓</span>}
                  {step.isCurrent && <span className="text-[9px] text-yellow-400 animate-pulse">← Now</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold font-mono text-sm ${
                    step.isDone
                      ? 'text-slate-500'
                      : step.isCurrent
                      ? step.isUserMove ? 'text-blue-300' : 'text-amber-300'
                      : 'text-slate-400'
                  }`}>
                    {step.san}
                  </span>
                  {!step.isUserMove && !step.isDone && step.isCurrent && (
                    <span className="text-[9px] text-slate-500 italic">(random reply)</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {currentStep >= lineMoves.length && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mt-1">
              <span className="text-emerald-400 text-sm">✓</span>
              <span className="text-xs text-emerald-400 font-semibold">Strategy complete! AI engine now active.</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper to compile a clean move history log for P2P multiplayer
  const renderMoveHistory = () => {
    const history = game.history();
    const moves = [];
    for (let i = 0; i < history.length; i += 2) {
      moves.push({
        num: Math.floor(i / 2) + 1,
        white: history[i],
        black: history[i + 1] || ''
      });
    }

    return (
      <div className="flex-1 flex flex-col min-h-0 select-none">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-3 text-slate-455 dark:text-slate-400">
          Move History
        </h3>
        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
          {moves.map((m) => (
            <div key={m.num} className="flex text-xs py-1.5 px-3 rounded bg-slate-800/35 border border-white/5 font-mono">
              <span className="w-8 text-slate-500 font-bold">{m.num}.</span>
              <span className="w-24 text-slate-200 font-medium">{m.white}</span>
              <span className="text-slate-400 font-medium">{m.black}</span>
            </div>
          ))}
          {moves.length === 0 && (
            <p className="text-slate-500 text-xs italic text-center py-4">No moves played yet.</p>
          )}
        </div>
      </div>
    );
  };

  // Helper to render PeerJS Duel Chat directly inside Right Panel
  const renderMultiplayerChat = () => {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-3 text-slate-455 dark:text-slate-400">
          Duel Chat
        </h3>
        {/* Connection status card info */}
        {peerId && (
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-white/5 mb-3 text-[10px] text-slate-400 flex flex-col gap-1 select-all">
            <span className="font-bold text-[9px] text-violet-400 uppercase tracking-wider">Connection Info</span>
            <span>Your Key: <code>{peerId}</code></span>
            {connectionStatus === 'connected' && <span>Status: <strong className="text-emerald-400">Connected</strong></span>}
          </div>
        )}

        {/* Message Logs */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-3 bg-slate-955/40 border border-white/5 rounded-xl p-3 scrollbar-thin flex flex-col min-h-0">
          {multiplayerMessages.map((msg, idx) => {
            if (msg.sender === 'system') {
              return (
                <div key={idx} className="text-center text-[10px] text-slate-500 italic py-1 leading-normal select-none">
                  {msg.text}
                </div>
              );
            }
            const isMe = msg.sender === 'me';
            return (
              <div 
                key={idx} 
                className={`max-w-[80%] rounded-xl px-2.5 py-1.5 text-xs leading-relaxed ${
                  isMe 
                    ? 'bg-violet-600 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none'
                }`}
                style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}
              >
                {msg.text}
              </div>
            );
          })}
          {multiplayerMessages.length === 0 && (
            <p className="text-slate-500 italic text-center text-xs py-8 select-none">No messages exchanged yet.</p>
          )}
        </div>

        {/* Form input */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            sendPeerChat();
          }}
          className="flex gap-1.5 shrink-0"
        >
          <input 
            type="text" 
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-slate-955 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 placeholder:text-slate-600 font-medium"
          />
          <button 
            type="submit" 
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-550 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    );
  };

  if (view === 'home') {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-chess-pattern w-full flex flex-col items-center p-6 pb-12 overflow-y-auto bg-slate-955 text-slate-100 relative animate-fade-in">
          
          {/* Theme Toggle */}
          <div className="absolute top-6 right-6 z-10">
            <button 
              onClick={() => {
                const val = !darkMode;
                setDarkMode(val);
                localStorage.setItem('chesstrainer_dark_mode', String(val));
              }}
              className="p-2.5 rounded-xl bg-slate-850 border border-slate-700/50 hover:bg-slate-700 transition-all text-sm cursor-pointer shadow-md"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Banner header */}
          <div className="text-center mt-6 sm:mt-10 mb-6 sm:mb-12 max-w-2xl px-4 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900/50 mb-3 text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-widest select-none">
              👑 Play & learn chess
            </div>
            {/* Solid text color heading instead of gradient */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-100 mb-3 leading-tight font-sans select-none">
              Chess Trainer for Noobs
            </h1>
            <p className="text-slate-550 dark:text-slate-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed select-none">
              Beginner-friendly chess coach. Learn strategies, play vs computer with real-time tactical indicators, or host a match with a friend.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="w-full max-w-5xl px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 shrink-0">
            {/* Card 1: AI Coach */}
            <div 
              onClick={startAICoachMode}
              className="glass-panel p-6 border-l-4 border-l-emerald-500 cursor-pointer hover:bg-slate-900/80 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-555/10 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl mb-4 font-bold">
                  🤖
                </div>
                <h3 className="text-xl font-bold text-slate-100 group-hover:text-emerald-500 transition-colors">Vs AI Coach</h3>
                <p className="text-xs text-slate-555 dark:text-slate-400 mt-2 leading-relaxed">
                  Play a full game from the initial position. Get instant hints (Checks, Captures, Threats, Plans) and tutor questions.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-550 dark:text-emerald-400 mt-6 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Start Match ➔
              </span>
            </div>

            {/* Card 2: Strategy Openings */}
            <div 
              onClick={() => {
                setGameMode('strategy');
                setCategoryFilter('all');
                setSearchQuery('');
              }}
              className="glass-panel p-6 border-l-4 border-l-blue-500 cursor-default flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-550/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl mb-4 font-bold">
                  📖
                </div>
                <h3 className="text-xl font-bold text-slate-100">Strategy Library</h3>
                <p className="text-xs text-slate-555 dark:text-slate-400 mt-2 leading-relaxed">
                  Learn 100+ standard openings (Ruy Lopez, Sicilian), midgames, and endgames step-by-step with real-time guides.
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-550/20 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 w-max mt-6">
                Explore Below
              </span>
            </div>

            {/* Card 3: Friend Duel */}
            <div 
              onClick={startMultiplayer}
              className="glass-panel p-6 border-l-4 border-l-violet-500 cursor-pointer hover:bg-slate-900/80 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-violet-555/10 dark:bg-violet-500/10 text-violet-655 dark:text-violet-400 flex items-center justify-center text-xl mb-4 font-bold">
                  👥
                </div>
                <h3 className="text-xl font-bold text-slate-100 group-hover:text-violet-400 transition-colors">Friend Duel (P2P)</h3>
                <p className="text-xs text-slate-555 dark:text-slate-400 mt-2 leading-relaxed">
                  Connect peer-to-peer with another player using a simple ID. Play real-time with a built-in chat board.
                </p>
              </div>
              <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 mt-6 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Join Lobby ➔
              </span>
            </div>

            {/* Card 4: Local vs Local */}
            <div 
              onClick={startLocalVsLocal}
              className="glass-panel p-6 border-l-4 border-l-orange-500 cursor-pointer hover:bg-slate-900/80 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-xl mb-4 font-bold">
                  🏠
                </div>
                <h3 className="text-xl font-bold text-slate-100 group-hover:text-orange-400 transition-colors">Local vs Local</h3>
                <p className="text-xs text-slate-555 dark:text-slate-400 mt-2 leading-relaxed">
                  Two players take turns on the same device. No AI recommendations or tutor hints — pure chess.
                </p>
              </div>
              <span className="text-xs font-semibold text-orange-500 dark:text-orange-400 mt-6 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Play Now ➔
              </span>
            </div>

            {/* Card 5: Simulation */}
            <div 
              onClick={startSimulation}
              className="glass-panel p-6 border-l-4 border-l-pink-500 cursor-pointer hover:bg-slate-900/80 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center text-xl mb-4 font-bold">
                  🎭
                </div>
                <h3 className="text-xl font-bold text-slate-100 group-hover:text-pink-400 transition-colors">Simulation</h3>
                <p className="text-xs text-slate-555 dark:text-slate-400 mt-2 leading-relaxed">
                  Choose your side (White or Black), then play a local match against yourself. No recommendations — pure simulation.
                </p>
              </div>
              <span className="text-xs font-semibold text-pink-500 dark:text-pink-400 mt-6 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Choose Side ➔
              </span>
            </div>
          </div>

          {/* Personalization Metrics Dashboard */}
          <div className="w-full max-w-5xl px-4 mb-8 shrink-0 animate-fade-in font-sans">
            <div className="glass-panel p-6 border border-white/5 flex flex-col md:flex-row gap-6 justify-between items-center shadow-xl">
              <div className="flex-1 w-full">
                <div className="flex justify-between items-center mb-4 select-none">
                  <div className="flex items-center gap-3">
                    <h3 className="text-md font-bold uppercase tracking-wider text-slate-400">
                      📊 Your Training Metrics
                    </h3>
                    {showResetSuccess && (
                      <span className="text-[10px] text-emerald-500 font-bold animate-pulse">
                        ✓ Reset successful!
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={handleResetData}
                    className="px-2.5 py-1.5 rounded-lg border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 text-[10px] font-extrabold uppercase transition-all shadow-md cursor-pointer"
                  >
                    Reset All Data 🗑️
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-900/60 border border-white/5 p-3.5 rounded-xl text-center select-none">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Games Started</span>
                    <strong className="text-xl font-black text-slate-100 mt-1 block">{metricsData.stats.gamesPlayed}</strong>
                  </div>
                  <div className="bg-slate-900/60 border border-white/5 p-3.5 rounded-xl text-center select-none">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Moves Trained</span>
                    <strong className="text-xl font-black text-slate-100 mt-1 block">{metricsData.stats.movesMade}</strong>
                  </div>
                  <div className="bg-slate-900/60 border border-white/5 p-3.5 rounded-xl text-center select-none">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tutor Correct</span>
                    <strong className="text-xl font-black text-emerald-500 mt-1 block">{metricsData.stats.tutorCorrectAnswers}</strong>
                  </div>
                  <div className="bg-slate-900/60 border border-white/5 p-3.5 rounded-xl text-center select-none">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tutor Accuracy</span>
                    <strong className="text-xl font-black text-blue-500 mt-1 block">
                      {metricsData.stats.tutorTotalAnswers > 0
                        ? `${Math.round((metricsData.stats.tutorCorrectAnswers / metricsData.stats.tutorTotalAnswers) * 100)}%`
                        : "0%"
                      }
                    </strong>
                  </div>
                </div>
              </div>

              {/* Recently Trained strategies (Personalization) */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2 select-none">Recently Learned</h4>
                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-thin select-none">
                  {Object.entries(metricsData.strategies).length > 0 ? (
                    Object.entries(metricsData.strategies)
                      .sort((a, b) => b[1].timesTrained - a[1].timesTrained)
                      .slice(0, 3)
                      .map(([id, info]) => (
                        <div key={id} className="flex justify-between items-center text-[10px] py-1 px-2 rounded bg-slate-900/50 border border-white/5">
                          <span className="font-semibold text-slate-300 truncate pr-2 max-w-[160px]">{info.name}</span>
                          <span className="text-slate-500 font-mono shrink-0 font-bold">{info.timesTrained}x trained</span>
                        </div>
                      ))
                  ) : (
                    <p className="text-[10px] text-slate-505 italic py-2">Select a strategy card below to begin learning!</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Directory Panel */}
          {gameMode === 'strategy' && (
            <div className="glass-panel w-full max-w-4xl p-4 sm:p-6 flex flex-col max-h-[80vh] mx-auto shadow-2xl">
              {/* Search Box */}
              <input
                type="text"
                placeholder="Search openings, midgames, endgames..."
                className="w-full p-3 rounded-xl bg-slate-800/80 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all text-sm mb-3 shrink-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Filters Row */}
              <div className="flex flex-col gap-2 mb-3 shrink-0">
                <div className="flex gap-1 bg-slate-950/40 p-1 rounded-xl border border-white/5">
                  {['all', 'openings', 'midgames', 'endgames'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-blue-600 text-slate-100 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat === 'midgames' ? 'Mid' : cat === 'endgames' ? 'End' : 'Open'}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1 bg-slate-955/40 p-1 rounded-xl border border-white/5">
                  {['all', 'white', 'black'].map(side => (
                    <button
                      key={side}
                      onClick={() => setSideFilter(side)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        sideFilter === side
                          ? 'bg-emerald-600 text-slate-100 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {side === 'all' ? 'All' : side === 'white' ? 'White ⚪' : 'Black ⚫'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Strategies Grid List */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 scrollbar-thin">
                {filteredStrategies.map(item => {
                  const tempCctp = calculateCCTP(item.startingFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                  const checkCount = tempCctp.checks.length;
                  const captureCount = tempCctp.captures.length;
                  const threatCount = tempCctp.threats.length;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectStrategy(item)}
                      className="glass-panel p-4 cursor-pointer hover:bg-slate-800/50 border border-white/5 hover:border-slate-500/20 transition-all flex flex-col justify-between group animate-fade-in"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-white/10 text-slate-450 dark:text-slate-400">
                            {item.category === 'midgames' ? 'Midgame Theme' : item.category === 'endgames' ? 'Endgame Scenario' : 'Opening'}
                          </span>
                          {item.category === 'openings' && (
                            <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                              item.color === 'white' ? 'bg-slate-200 text-slate-900' : 'bg-slate-955 text-slate-100'
                            }`}>
                              {item.color}
                            </span>
                          )}
                        </div>
                        <h3 className="text-md font-bold text-blue-500 dark:text-blue-450 group-hover:text-blue-400 transition-colors leading-tight">{item.name}</h3>
                        <p className="text-slate-500 dark:text-slate-300 text-xs mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>
                        
                        {/* Interactive Checks, Captures, threats counts displayed directly in strategy directory */}
                        <div className="flex flex-wrap gap-2 mt-3 select-none">
                          {checkCount > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-550 dark:text-red-400 font-bold">
                              💥 {checkCount} Check{checkCount > 1 && 's'}
                            </span>
                          )}
                          {captureCount > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold">
                              ⚔️ {captureCount} Capture{captureCount > 1 && 's'}
                            </span>
                          )}
                          {threatCount > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-650 dark:text-purple-400 font-bold">
                              🎯 {threatCount} Threat{threatCount > 1 && 's'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredStrategies.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <p className="text-slate-550 italic">No strategies found matching your filters and search query.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'color-select') {
    const isWhiteRecommended = selectedStrategy.color === 'white';
    const isBlackRecommended = selectedStrategy.color === 'black';

    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="flex items-center justify-center min-h-screen bg-chess-pattern p-6 bg-slate-955 text-slate-100 relative animate-fade-in">
          
          {/* Theme Toggle */}
          <div className="absolute top-6 right-6">
            <button 
              onClick={() => {
                const val = !darkMode;
                setDarkMode(val);
                localStorage.setItem('chesstrainer_dark_mode', String(val));
              }}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/50 hover:bg-slate-700 transition-all text-sm cursor-pointer shadow-md"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          <div className="glass-panel text-center max-w-lg w-full p-8 shadow-2xl">
            {/* Solid text color heading instead of gradient */}
            <h2 className="text-3xl font-bold mb-4 text-slate-100">
              Choose Your Side
            </h2>
            <p className="text-slate-400 mb-8 text-sm">
              Train this strategy as White or Black.
            </p>
            <div className="flex gap-4 justify-center">
              <button 
                className={`w-36 py-3 rounded-lg font-semibold transition-all duration-305 hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                  isWhiteRecommended 
                    ? 'bg-blue-600 text-slate-100 hover:bg-blue-750' 
                    : 'bg-slate-800 hover:bg-slate-700 border border-white/20 text-slate-300'
                }`}
                onClick={() => {
                  setUserColor('w');
                  game.load(selectedStrategy.startingFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                  forceUpdate();
                  setView('trainer');
                }}
              >
                White {isWhiteRecommended && "⭐"}
              </button>
              <button 
                className={`w-36 py-3 rounded-lg font-semibold transition-all duration-305 hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                  isBlackRecommended 
                    ? 'bg-blue-600 text-slate-100 hover:bg-blue-750' 
                    : 'bg-slate-800 hover:bg-slate-700 border border-white/20 text-slate-300'
                }`}
                onClick={() => {
                  setUserColor('b');
                  if (gameMode === 'ai-coach') {
                    game.load("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                    forceUpdate();
                    setView('trainer');
                  } else if (selectedStrategy.color === 'black') {
                    setView('opponent-strategy-select');
                  } else {
                    setWhiteStrategy(selectedStrategy);
                    setView('black-defense-select');
                  }
                }}
              >
                Black {isBlackRecommended && "⭐"}
              </button>
            </div>
            {selectedStrategy.color && (
              <p className="text-xs text-blue-550 dark:text-blue-400 mt-4 font-semibold uppercase tracking-wider">
                Recommended: {selectedStrategy.color}
              </p>
            )}
            <button className="mt-8 text-slate-405 underline block mx-auto hover:text-slate-100" onClick={() => setView('home')}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'opponent-strategy-select') {
    const whiteOpenings = strategiesData.openings.filter(op => op.color === 'white');

    // If we already have a Black strategy chosen from homepage, recommend compatible White openings
    const isPathA = selectedStrategy && selectedStrategy.color === 'black';
    const finalRecWhiteIds = isPathA ? getRecommendedWhiteOpenings(selectedStrategy.id) : [];

    const recWhiteOpenings = isPathA ? whiteOpenings.filter(op => finalRecWhiteIds.includes(op.id)) : whiteOpenings;
    const otherWhiteOpenings = isPathA ? whiteOpenings.filter(op => !finalRecWhiteIds.includes(op.id)) : whiteOpenings;

    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="flex items-center justify-center min-h-screen bg-chess-pattern p-6 bg-slate-955 text-slate-100 relative animate-fade-in font-sans">
          
          {/* Theme Toggle */}
          <div className="absolute top-6 right-6">
            <button 
              onClick={() => {
                const val = !darkMode;
                setDarkMode(val);
                localStorage.setItem('chesstrainer_dark_mode', String(val));
              }}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/50 hover:bg-slate-700 transition-all text-sm cursor-pointer shadow-md"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          <div className="glass-panel max-w-2xl w-full p-8 max-h-[85vh] flex flex-col shadow-2xl animate-fade-in">
            {/* Solid text color heading instead of gradient */}
            <h2 className="text-3xl font-bold mb-2 text-slate-100">
              Choose White's Strategy
            </h2>
            <p className="text-slate-400 mb-6 text-sm">
              {isPathA 
                ? `Select White's opening to test your training on the ${selectedStrategy.name}:`
                : "Select the White opening strategy you want the opponent to play against you."}
            </p>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {/* Recommended White openings (Path A) */}
              {isPathA && recWhiteOpenings.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-emerald-455 dark:text-emerald-400 flex items-center gap-1">
                    <span>⭐</span> Recommended Openings
                  </h3>
                  <div className="space-y-3">
                    {recWhiteOpenings.map(item => (
                      <div 
                        key={item.id} 
                        className="glass-panel p-4 cursor-pointer hover:bg-slate-700/50 border border-emerald-500/20 hover:border-emerald-500/50 transition-colors flex justify-between items-center group" 
                        onClick={() => {
                          // User already has a Black strategy. So the training follows this White line against them!
                          setSelectedStrategy(item);
                          game.load(item.startingFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                          forceUpdate();
                          setView('trainer');
                        }}
                      >
                        <div>
                          <h4 className="text-lg font-bold text-blue-500 group-hover:text-blue-400 transition-colors leading-tight">{item.name}</h4>
                          <p className="text-slate-555 dark:text-slate-300 text-xs mt-1 leading-relaxed">{item.description}</p>
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-slate-100 shrink-0 ml-4">
                          Recommended
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other White openings */}
              <div>
                {isPathA && recWhiteOpenings.length > 0 && (
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-slate-500">
                    Other Openings
                  </h3>
                )}
                <div className="space-y-3">
                  {whiteOpenings.map(item => (
                    <div 
                      key={item.id} 
                      className="glass-panel p-4 cursor-pointer hover:bg-slate-700/50 transition-colors group" 
                      onClick={() => {
                        setSelectedStrategy(item);
                        game.load(item.startingFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                        forceUpdate();
                        setView('trainer');
                      }}
                    >
                      <h3 className="text-xl font-bold text-emerald-500 dark:text-emerald-400 group-hover:text-emerald-450 transition-colors">{item.name}</h3>
                      <p className="text-slate-555 dark:text-slate-300 text-sm mt-1">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button 
              className="btn-primary mt-6 shrink-0 cursor-pointer" 
              onClick={() => setView(selectedStrategy?.color === 'black' ? 'home' : 'color-select')}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'black-defense-select') {
    const whiteId = whiteStrategy ? whiteStrategy.id : '';
    const recIds = recommendedDefenses[whiteId] || [];
    
    // Fallback recommended defenses based on first move
    let fallbackRecIds = [];
    if (recIds.length === 0 && whiteStrategy) {
      const firstMove = whiteStrategy.lines?.[0]?.moves?.[0];
      if (firstMove === 'e4') {
        fallbackRecIds = ['sicilian_defense', 'french_defense', 'caro_kann_defense', 'scandinavian_defense'];
      } else if (firstMove === 'd4') {
        fallbackRecIds = ['king_s_indian_defense', 'nimzo_indian_defense', 'grunfeld_defense'];
      }
    }

    const finalRecIds = [...recIds, ...fallbackRecIds];
    const allBlackOpenings = strategiesData.openings.filter(op => op.color === 'black');
    const recommendedBlackOpenings = allBlackOpenings.filter(op => finalRecIds.includes(op.id));
    const otherBlackOpenings = allBlackOpenings.filter(op => !finalRecIds.includes(op.id));

    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="flex items-center justify-center min-h-screen bg-chess-pattern p-6 bg-slate-955 text-slate-100 relative animate-fade-in">
          
          {/* Theme Toggle */}
          <div className="absolute top-6 right-6">
            <button 
              onClick={() => {
                const val = !darkMode;
                setDarkMode(val);
                localStorage.setItem('chesstrainer_dark_mode', String(val));
              }}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/50 hover:bg-slate-700 transition-all text-sm cursor-pointer shadow-md"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          <div className="glass-panel max-w-2xl w-full p-8 max-h-[85vh] flex flex-col shadow-2xl animate-fade-in font-sans">
            {/* Solid text color heading instead of gradient */}
            <h2 className="text-3xl font-bold mb-2 text-slate-100">
              Select Your Defense Strategy
            </h2>
            <p className="text-slate-400 mb-6 text-sm">
              White will play the <strong className="text-emerald-555 dark:text-emerald-400">{whiteStrategy?.name}</strong>. Choose which defense strategy you want to train:
            </p>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {/* Recommended Section */}
              {recommendedBlackOpenings.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-emerald-455 dark:text-emerald-400 flex items-center gap-1">
                    <span>⭐</span> Recommended Defenses
                  </h3>
                  <div className="space-y-3">
                    {recommendedBlackOpenings.map(item => (
                      <div 
                        key={item.id} 
                        className="glass-panel p-4 cursor-pointer hover:bg-slate-700/50 border border-emerald-500/20 hover:border-emerald-500/50 transition-colors flex justify-between items-center group animate-fade-in" 
                        onClick={() => {
                          setSelectedStrategy(item);
                          game.load(item.startingFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                          forceUpdate();
                          setView('trainer');
                        }}
                      >
                        <div>
                          <h4 className="text-lg font-bold text-blue-500 group-hover:text-blue-400 transition-colors leading-tight">{item.name}</h4>
                          <p className="text-slate-550 dark:text-slate-300 text-xs mt-1 leading-relaxed">{item.description}</p>
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded bg-emerald-600 text-slate-100 shrink-0 ml-4">
                          Recommended
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Options Section */}
              {otherBlackOpenings.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-slate-505">
                    Other Defenses
                  </h3>
                  <div className="space-y-3">
                    {otherBlackOpenings.map(item => (
                      <div 
                        key={item.id} 
                        className="glass-panel p-4 cursor-pointer hover:bg-slate-700/30 border border-white/5 hover:border-slate-500/30 transition-colors group animate-fade-in" 
                        onClick={() => {
                          setSelectedStrategy(item);
                          game.load(item.startingFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                          forceUpdate();
                          setView('trainer');
                        }}
                      >
                        <h4 className="text-lg font-bold text-slate-400 group-hover:text-slate-300 transition-colors leading-tight">{item.name}</h4>
                        <p className="text-slate-500 text-xs mt-1 leading-relaxed">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="btn-primary mt-6 shrink-0 cursor-pointer" onClick={() => setView('opponent-strategy-select')}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'multiplayer-lobby') {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="flex items-center justify-center min-h-screen bg-chess-pattern p-4 sm:p-6 bg-slate-955 text-slate-100 relative animate-fade-in overflow-y-auto">
          
          {/* Theme Toggle */}
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={() => {
                const val = !darkMode;
                setDarkMode(val);
                localStorage.setItem('chesstrainer_dark_mode', String(val));
              }}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/50 hover:bg-slate-700 transition-all text-sm cursor-pointer shadow-md"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          <div className="glass-panel max-w-sm sm:max-w-md w-full p-6 sm:p-8 shadow-2xl flex flex-col items-center font-sans my-6">
            <div className="w-12 h-12 rounded-2xl bg-violet-555/10 dark:bg-violet-500/10 text-violet-650 dark:text-violet-400 flex items-center justify-center text-3xl mb-4 font-bold animate-pulse">
              👥
            </div>
            {/* Solid text color heading instead of gradient */}
            <h2 className="text-3xl font-black text-slate-100 mb-2">
              Multiplayer Duel
            </h2>
            <p className="text-slate-400 text-center text-xs mb-8">
              Host a game or join a friend. Live chessboard coordinates, engine hints, and instant chat.
            </p>

            {/* Connection Status Indicator */}
            <div className="w-full flex flex-col items-center p-4 bg-slate-905/60 border border-white/5 rounded-2xl mb-6">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">Your Connection Key</span>
              {connectionStatus === 'connecting' ? (
                <div className="flex items-center gap-2 text-xs text-violet-500 animate-pulse">
                  <span className="animate-spin">🌀</span> Generating peer key...
                </div>
              ) : (
                <div className="flex flex-col items-center w-full gap-3">
                  {/* Peer ID text */}
                  <code className="text-lg font-black font-mono text-slate-200 select-all tracking-wider px-3 py-1 bg-slate-950/80 rounded border border-white/5">
                    {peerId || "---"}
                  </code>

                  {/* QR Code - encodes a direct URL to the site with the peer ID pre-filled */}
                  {peerId && (() => {
                    const connectUrl = `${window.location.origin}${window.location.pathname}?peer=${peerId}`;
                    return (
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 sm:p-3 bg-white rounded-xl shadow-md">
                          <QRCodeSVG
                            value={connectUrl}
                            size={130}
                            bgColor="#ffffff"
                            fgColor="#1e293b"
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 text-center max-w-[200px] leading-relaxed">
                          Friend scans QR → opens site → auto-connects
                        </p>

                        {/* Copy invite link button */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(peerId);
                              setCopyToast(true);
                              setTimeout(() => setCopyToast(false), 2000);
                            }}
                            className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-[10px] font-bold uppercase transition-all shadow-md active:scale-95 cursor-pointer border border-white/10"
                          >
                            {copyToast ? '✓ Copied!' : 'Copy ID'}
                          </button>
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}${window.location.pathname}?peer=${peerId}`;
                              navigator.clipboard.writeText(link);
                              setCopyToast(true);
                              setTimeout(() => setCopyToast(false), 2000);
                            }}
                            className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-slate-100 text-[10px] font-bold uppercase transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            {copyToast ? '✓ Copied!' : 'Copy Link'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Connect Input */}
            <div className="w-full border-t border-white/10 pt-6 flex flex-col gap-3">
              <label className="text-xs font-semibold text-slate-400">Join a Friend</label>
              <input 
                type="text" 
                placeholder="Paste friend's Peer ID here..."
                value={peerTargetId}
                onChange={(e) => setPeerTargetId(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-955 border border-white/10 text-slate-100 text-xs font-mono tracking-widest text-center focus:outline-none focus:border-violet-500 transition-all placeholder:text-slate-655"
              />
              <button 
                disabled={!peerId || connectionStatus === 'connecting'}
                onClick={connectToFriend}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-750 text-slate-100 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Connect to Friend
              </button>
            </div>

            <button className="mt-8 text-slate-400 underline block text-xs hover:text-slate-100" onClick={() => setView('home')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-render layout blocks to inject responsively
  const leftPanelContent = (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Player Profile Header inside sidebar (replaces Your Options title) */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-white/10 shrink-0 select-none">
        <img 
          src="https://picsum.photos/seed/player/80/80" 
          alt="Player Avatar" 
          className="w-10 h-10 rounded-full border border-slate-700/50 shadow-sm"
        />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-100 leading-none font-sans">You (Player)</span>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${game.turn() === userColor && !game.isGameOver() ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`}></span>
            {game.turn() === userColor && !game.isGameOver() ? 'Your Turn' : 'Waiting...'} ({userColor === 'w' ? 'White ⚪' : 'Black ⚫'})
          </span>
        </div>
      </div>
      
      {/* Dynamic Content: Options or Move History log */}
      {gameMode === 'multiplayer' ? (
        renderMoveHistory()
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {gameMode === 'strategy' && deviated && (
            <div className="p-3 mb-4 bg-red-955/40 border border-red-500/30 rounded-xl text-xs text-red-355 dark:text-red-300 animate-pulse">
              <strong className="block text-red-400 font-bold mb-1">⚠️ STRATEGY DEVIATION</strong>
              {deviationMsg}
            </div>
          )}

          {/* Strategy Roadmap Tree - shown above move options when in strategy mode */}
          {gameMode === 'strategy' && !deviated && renderStrategyTree()}

          <p className="text-xs text-slate-450 dark:text-slate-400 mb-4 select-none leading-relaxed">
            {game.turn() === userColor 
              ? "Click your piece then destination. Tap 👁 on a move to preview opponent replies (touch)." 
              : "Waiting for opponent's reply..."}
          </p>
          
          <div className="flex-1 overflow-y-auto pr-1">
            {game.turn() === userColor ? (
              <>
                {/* 1. Recommended Moves (Always shown in top only) */}
                {renderRecommendedSection()}

                {/* 2. Standard Move categories (excluding recommendations) — hidden during strategy teaching phase */}
                {(gameMode !== 'strategy' || strategyTaught || deviated) && (
                  <>
                    {renderMoveList("Checks (C)", filteredChecks, "text-red-400")}
                    {renderMoveList("Captures (C)", filteredCaptures, "text-amber-405 dark:text-amber-400")}
                    {renderMoveList("Threats (T)", filteredThreats, "text-purple-400")}
                    {renderMoveList("Plans / Center (P)", filteredPlans, "text-blue-400")}
                  </>
                )}
              </>
            ) : (
              <div className="p-4 bg-slate-800/50 rounded-xl border border-white/5 text-center text-slate-400 italic text-sm select-none">
                Thinking move for opponent...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const rightPanelContent = (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Opponent Profile Header inside sidebar (replaces Opponent Options title) */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-white/10 shrink-0 select-none">
        <img 
          src="https://picsum.photos/seed/opponent/80/80" 
          alt="Opponent Avatar" 
          className="w-10 h-10 rounded-full border border-slate-700/50 shadow-sm"
        />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-100 leading-none font-sans">
            {gameMode === 'strategy' ? (selectedStrategy?.name || "Strategy Bot") : gameMode === 'ai-coach' ? "AI Coach" : "Friend Opponent"}
          </span>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${game.turn() !== userColor && !game.isGameOver() ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`}></span>
            {game.turn() !== userColor && !game.isGameOver() ? 'Thinking...' : 'Online'} ({userColor === 'w' ? 'Black ⚫' : 'White ⚪'})
          </span>
        </div>
      </div>

      {/* Dynamic Content: Blunder Check Options or P2P chat log */}
      {gameMode === 'multiplayer' ? (
        renderMultiplayerChat()
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto pr-1">
            {hoveredOpponentCCTP ? (
              <div>
                <p className="text-xs text-rose-455 dark:text-rose-400 mb-4 bg-rose-950/30 border border-rose-500/20 rounded p-2">
                  Previewing replies if you play <strong className="underline">{hoveredOpponentCCTP.moveSan}</strong>:
                </p>
                {renderMoveList("Opponent Checks (C)", hoveredOpponentCCTP.checks, "text-red-400")}
                {renderMoveList("Opponent Captures (C)", hoveredOpponentCCTP.captures, "text-amber-405 dark:text-amber-400")}
                {renderMoveList("Opponent Threats (T)", hoveredOpponentCCTP.threats, "text-purple-400")}
                {renderMoveList("Opponent Plans (P)", hoveredOpponentCCTP.plans, "text-blue-400")}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/5 rounded-xl select-none">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-2xl animate-pulse">
                  🎯
                </div>
                <p className="text-sm text-slate-400 font-bold">Blunder Check</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  <span className="hidden lg:inline">Hover over a move in the left column to preview opponent replies.</span>
                  <span className="lg:hidden">Tap the <strong>👁</strong> button on any move in the left column to preview opponent replies before committing.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Simulation color select view
  if (view === 'simulation-color-select') {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="flex items-center justify-center min-h-screen bg-chess-pattern p-6 bg-slate-955 text-slate-100 relative animate-fade-in">
          <div className="glass-panel text-center max-w-lg w-full p-8 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center text-3xl mb-4 mx-auto">🎭</div>
            <h2 className="text-3xl font-bold mb-2 text-slate-100">Simulation</h2>
            <p className="text-slate-400 mb-8 text-sm">Choose which side you will start as. Both sides will be playable locally with no AI assistance.</p>
            <div className="flex gap-4 justify-center">
              <button
                className="w-36 py-3 rounded-lg font-semibold bg-slate-100 text-slate-900 hover:bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                onClick={() => {
                  setUserColor('w');
                  game.reset();
                  forceUpdate();
                  setLastMove(null);
                  setView('trainer');
                }}
              >
                ⚪ White
              </button>
              <button
                className="w-36 py-3 rounded-lg font-semibold bg-slate-800 text-slate-100 border border-white/20 hover:bg-slate-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
                onClick={() => {
                  setUserColor('b');
                  game.reset();
                  forceUpdate();
                  setLastMove(null);
                  setView('trainer');
                }}
              >
                ⚫ Black
              </button>
            </div>
            <button className="btn-primary mt-8 cursor-pointer" onClick={() => setView('home')}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden relative font-sans animate-fade-in">
        
        {/* Header - compact on mobile */}
        <div className="flex items-center px-3 sm:px-6 py-2.5 sm:py-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md shrink-0 gap-2 sm:gap-3 min-h-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Solid text color heading instead of gradient */}
            <h1 className="text-sm sm:text-base md:text-xl font-bold text-slate-100 leading-none truncate">
              {selectedStrategy ? selectedStrategy.name : "Chess Trainer"}
            </h1>
            <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-800 border border-white/10 text-[9px] font-semibold text-slate-300 shrink-0">
              {userColor === 'w' ? 'White ⚪' : 'Black ⚫'}
            </span>
            {gameMode === 'multiplayer' && (
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-450 border border-violet-500/20 text-[9px] font-semibold uppercase animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400"></span> Duel
              </span>
            )}
          </div>

          {/* Head controls - right side compact row */}
          <div className="flex items-center gap-1.5 sm:gap-3 ml-auto shrink-0">
            {gameMode === 'multiplayer' ? (
              <button 
                onClick={requestRestartMultiplayer}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-[9px] sm:text-[10px] text-slate-300 font-bold transition-all active:scale-95 cursor-pointer"
              >
                Restart
              </button>
            ) : (
              <label 
                className="flex items-center gap-1 cursor-pointer text-[9px] sm:text-[10px] font-semibold text-slate-300 bg-slate-800 px-2 py-1.5 rounded-lg border border-white/10 hover:bg-slate-700 transition-all select-none relative group"
                title="Toggles tutor popups at the start of your turn"
              >
                <span>Tutor:</span>
                <input 
                  type="checkbox" 
                  checked={quizEnabled} 
                  onChange={(e) => {
                    const val = e.target.checked;
                    setQuizEnabled(val);
                    localStorage.setItem('chesstrainer_tutor_enabled', String(val));
                  }} 
                  className="accent-blue-500 cursor-pointer w-3 h-3"
                />
                <span className={quizEnabled ? "text-emerald-400 font-bold" : "text-slate-505"}>
                  {quizEnabled ? "ON" : "OFF"}
                </span>

                {/* Subtle visual helper tip to turn off tutor */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded bg-slate-900 border border-white/10 text-[9px] font-medium leading-normal text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl text-center z-50">
                  💡 Turn Tutor OFF if you want to play without question dialogs.
                </span>
              </label>
            )}

            {/* Dark Mode Sun/Moon Button */}
            <button 
              onClick={() => {
                const val = !darkMode;
                setDarkMode(val);
                localStorage.setItem('chesstrainer_dark_mode', String(val));
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 transition-all text-xs cursor-pointer"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            <button 
              className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-bold text-[9px] sm:text-[10px] text-slate-300 hover:text-slate-100 cursor-pointer"
              onClick={() => {
                if (conn) conn.close();
                setView('home');
              }}
            >
              Exit
            </button>
          </div>
        </div>

        {/* 3-Pane Layout: mobile = board on top + tab panels below; desktop = 3 side-by-side columns */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* Left Column (Your Options): Sidebar on LG screen, Tab Panel on Tablet/Mobile */}
          <div className={`border-r border-white/10 bg-slate-900/40 p-4 sm:p-6 flex flex-col overflow-y-auto lg:w-[300px] xl:w-[360px] shrink-0 ${
            mobileTab === 'mine' ? 'flex h-[42vh] lg:h-auto lg:flex-1' : 'hidden lg:flex'
          }`}>
            {leftPanelContent}
          </div>

          {/* Middle Column (Chessboard): Fills top of screen on mobile, center on desktop */}
          <div className="flex-1 bg-slate-955 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 relative shrink-0 lg:shrink">
            
            {/* Chessboard framed wrapper - tighter on mobile */}
            <div className="w-full max-w-[min(85vw,calc(100vh-200px))] sm:max-w-[min(85vw,65vh)] aspect-square rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.2)] border border-slate-700/50 p-1.5 sm:p-2 bg-slate-900/60 backdrop-blur-md relative">
              <CustomChessboard 
                position={game.fen()} 
                onSquareClick={onSquareClick}
                onSquareMouseEnter={onSquareMouseEnter}
                onSquareMouseLeave={onSquareMouseLeave}
                boardOrientation={userColor === 'w' ? 'white' : 'black'}
                customSquareStyles={getCustomSquareStyles()}
                arrows={getArrows()}
                lastMove={lastMove}
              />
            </div>

            {/* In-game Legend indicator Row - Hidden in multiplayer mode, compact on mobile */}
            {gameMode !== 'multiplayer' && (
              <div className="mt-2 sm:mt-4 flex flex-wrap gap-2 sm:gap-4 justify-center text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Best</span>
                </div>
                {gameMode === 'strategy' && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-500"></span>
                    <span>Strategy</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-500"></span>
                  <span>Hover / Target</span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile switcher tab bar */}
          <div className="flex border-y border-white/10 lg:hidden shrink-0 bg-slate-900 select-none">
            <button 
              onClick={() => setMobileTab('mine')}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                mobileTab === 'mine' 
                  ? 'text-blue-500 border-b-2 border-blue-500 bg-slate-800' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👤 {gameMode === 'multiplayer' ? "Moves" : "Options"}
            </button>
            <button 
              onClick={() => setMobileTab('opp')}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                mobileTab === 'opp' 
                  ? 'text-rose-500 border-b-2 border-rose-500 bg-slate-800' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🤖 {gameMode === 'multiplayer' ? "Chat" : "Replies"}
            </button>
          </div>

          {/* Right Column (Opponent Options): Sidebar on LG screen, Tab Panel on Tablet/Mobile */}
          <div className={`border-l border-white/10 bg-slate-900/40 p-4 sm:p-6 flex flex-col overflow-y-auto lg:w-[300px] xl:w-[360px] shrink-0 ${
            mobileTab === 'opp' ? 'flex h-[42vh] lg:h-auto lg:flex-1' : 'hidden lg:flex'
          }`}>
            {rightPanelContent}
          </div>

        </div>

        {/* Floating Chat / Tutor Widget - Chatbot Tutor is completely hidden in P2P multiplayer mode */}
        {gameMode !== 'multiplayer' && activeQuestion && (
          <div className="fixed bottom-6 right-6 z-50 w-[340px] bg-slate-950 dark:bg-slate-900 border border-slate-800 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col animate-fade-in font-sans">
            {/* Header */}
            <div className="bg-slate-900 dark:bg-slate-955 px-4 py-3 flex items-center justify-between border-b border-slate-800 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="text-xl">🤖</span>
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 tracking-wide leading-none">Chess Tutor</h4>
                  <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-semibold leading-none mt-0.5 block">Online & Speaking</span>
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    const newVal = !speechEnabled;
                    setSpeechEnabled(newVal);
                    if (!newVal && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    speechEnabled 
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-600 dark:text-blue-400' 
                      : 'bg-slate-800 dark:bg-slate-900 border-slate-700 dark:border-white/10 text-slate-400 dark:text-slate-300'
                  }`}
                  title={speechEnabled ? "Mute Voice" : "Unmute Voice"}
                >
                  {speechEnabled ? '🔊' : '🔇'}
                </button>
                
                <button 
                  onClick={handleContinue}
                  className="p-1.5 rounded-lg border border-slate-700 dark:border-white/10 bg-slate-800 dark:bg-slate-900 text-slate-400 dark:text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-all text-xs cursor-pointer"
                  title="Close Tutor"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 flex-1 flex flex-col overflow-y-auto max-h-[360px] scrollbar-thin bg-slate-950 dark:bg-slate-900">
              <div className="space-y-3">
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-800 dark:bg-indigo-900/50 flex items-center justify-center text-xs shrink-0 select-none text-slate-100">
                    🎓
                  </div>
                  <div className="bg-slate-900 dark:bg-slate-950 border border-slate-800 dark:border-white/5 rounded-2xl rounded-tl-none p-3 text-xs leading-relaxed text-slate-100">
                    <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">Tutor</p>
                    {activeQuestion.question}
                  </div>
                </div>

                {quizFeedback && (
                  <div className="flex gap-2 items-start animate-fade-in">
                    <div className="w-6 h-6 rounded-full bg-slate-800 dark:bg-indigo-900/50 flex items-center justify-center text-xs shrink-0 select-none text-slate-100">
                      {quizFeedback.isCorrect ? '✅' : '❌'}
                    </div>
                    <div className={`border rounded-2xl rounded-tl-none p-3 text-xs leading-relaxed ${
                      quizFeedback.isCorrect 
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-250/30 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                        : 'bg-rose-100 dark:bg-rose-950/40 border-rose-250/30 dark:border-rose-500/20 text-rose-800 dark:text-rose-300'
                    }`}>
                      <p className="font-bold mb-1">
                        {quizFeedback.isCorrect ? 'Correct Assessment!' : 'Incorrect Assessment'}
                      </p>
                      {quizFeedback.text}
                    </div>
                  </div>
                )}
              </div>

              {/* Action area */}
              <div className="mt-4 pt-3 border-t border-slate-800 dark:border-white/5">
                {!quizFeedback ? (
                  <div className="flex flex-col gap-2">
                    {activeQuestion.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left text-xs font-semibold transition-all text-slate-200 dark:text-slate-300 hover:text-slate-100 dark:hover:text-slate-100 cursor-pointer"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={handleContinue}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Continue Training
                  </button>
                )}
              </div>

              {/* Help hint to turn off the tutor */}
              <p className="text-[10px] text-slate-500 italic mt-4 text-center leading-normal">
                💡 Tip: You can disable this tutor anytime using the "Tutor" toggle in the top header.
              </p>

            </div>
          </div>
        )}

        {/* 🎉 Confetti / Party Popper Celebration Overlay on Checkmate */}
        {showConfetti && (
          <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden" aria-hidden="true">
            {/* Animated confetti particles */}
            {Array.from({ length: 60 }).map((_, i) => {
              const colors = ['#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#ef4444','#06b6d4','#84cc16'];
              const color = colors[i % colors.length];
              const left = `${(i * 1.667).toFixed(1)}%`;
              const delay = `${(i * 0.06).toFixed(2)}s`;
              const dur = `${(1.4 + (i % 5) * 0.25).toFixed(2)}s`;
              const size = `${8 + (i % 6) * 3}px`;
              const isCircle = i % 3 === 0;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: '-20px',
                    left,
                    width: size,
                    height: isCircle ? size : `${4 + (i % 4) * 2}px`,
                    borderRadius: isCircle ? '50%' : '2px',
                    background: color,
                    animation: `confettiFall ${dur} ${delay} ease-in forwards`,
                    transform: `rotate(${i * 37}deg)`,
                  }}
                />
              );
            })}

            {/* Winner banner */}
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <div className="bg-slate-950/90 border border-yellow-400/40 rounded-3xl px-6 sm:px-10 py-6 sm:py-8 text-center shadow-2xl backdrop-blur-md animate-bounce-in max-w-xs w-full">
                <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
                <h2 className="text-2xl sm:text-3xl font-black text-yellow-400 mb-2">Checkmate!</h2>
                <p className="text-slate-300 text-sm">
                  {game.turn() === 'w'
                    ? '🏆 Black wins the game!'
                    : '🏆 White wins the game!'}
                </p>
                <p className="text-slate-400 text-xs mt-2 animate-pulse">🎊 Congratulations! 🎊</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
