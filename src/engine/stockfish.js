export class StockfishEngine {
  constructor() {
    try {
      // Use Blob to load Stockfish from CDN via Web Worker without CORS issues
      const blobCode = `importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');`;
      const blob = new Blob([blobCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      
      this.onBestMove = null;
      this.onEvaluation = null;
      this.onTopMoves = null; // Callback for top moves array: (moves) => {}

      this.currentDepth = 0;
      this.topMoves = {};

      this.worker.onmessage = (e) => {
        const line = e.data;
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          const bestMove = parts[1]; // e.g. "e2e4"
          if (this.onBestMove) {
            this.onBestMove(bestMove);
          }
        } else if (line.startsWith('info')) {
          if (this.onEvaluation && line.includes('score')) {
            this.onEvaluation(line);
          }
          
          if (line.includes('multipv')) {
            const depthMatch = line.match(/depth (\d+)/);
            const multipvMatch = line.match(/multipv (\d+)/);
            const pvMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);

            if (depthMatch && multipvMatch && pvMatch) {
              const depth = parseInt(depthMatch[1], 10);
              const multipv = parseInt(multipvMatch[1], 10);
              const uciMove = pvMatch[1];

              if (depth >= this.currentDepth) {
                if (depth > this.currentDepth) {
                  this.currentDepth = depth;
                  this.topMoves = {};
                }
                this.topMoves[multipv] = uciMove;

                if (this.onTopMoves) {
                  const sortedMoves = Object.keys(this.topMoves)
                    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                    .map(mpv => this.topMoves[mpv]);
                  
                  // Throttle UI updates to max 4 times a second to prevent React render lagging
                  const now = Date.now();
                  if (!this.lastTopMovesEmit || now - this.lastTopMovesEmit > 250) {
                    this.onTopMoves(sortedMoves);
                    this.lastTopMovesEmit = now;
                  }
                  
                  clearTimeout(this.topMovesTimeout);
                  this.topMovesTimeout = setTimeout(() => {
                    if (this.onTopMoves) this.onTopMoves(sortedMoves);
                  }, 250);
                }
              }
            }
          }
        }
      };

      this.worker.postMessage('uci');
      // Set options: low latency, MultiPV 3, skill level 20
      this.worker.postMessage('setoption name Skill Level value 20');
      this.worker.postMessage('setoption name MultiPV value 3');
    } catch (e) {
      console.error('Failed to initialize Stockfish worker:', e);
    }
  }

  evaluate(fen, depth = 12) {
    if (!this.worker) return;
    this.currentDepth = 0;
    this.topMoves = {};
    this.worker.postMessage('stop');
    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go depth ${depth}`);
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
    }
  }
}

