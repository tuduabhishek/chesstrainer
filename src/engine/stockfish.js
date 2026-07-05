export class StockfishEngine {
  constructor() {
    try {
      // Use Blob to load Stockfish from CDN via Web Worker without CORS issues
      const blobCode = `importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');`;
      const blob = new Blob([blobCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      
      this.onBestMove = null;
      this.onEvaluation = null;

      this.worker.onmessage = (e) => {
        const line = e.data;
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ');
          const bestMove = parts[1]; // e.g. "e2e4"
          if (this.onBestMove) {
            this.onBestMove(bestMove);
          }
        } else if (line.startsWith('info') && line.includes('score')) {
          if (this.onEvaluation) {
            this.onEvaluation(line);
          }
        }
      };

      this.worker.postMessage('uci');
      // Set options if needed, e.g., low latency
      this.worker.postMessage('setoption name Skill Level value 20');
    } catch (e) {
      console.error('Failed to initialize Stockfish worker:', e);
    }
  }

  evaluate(fen, depth = 12) {
    if (!this.worker) return;
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
