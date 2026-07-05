import { Chess } from 'chess.js';

export function calculateCCTP(fen) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  const activeColor = chess.turn();

  const checks = [];
  const captures = [];
  const threats = [];
  const plans = [];

  // Piece values to help classify threats
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  for (const move of moves) {
    const tempGame = new Chess(fen);
    tempGame.move({ from: move.from, to: move.to, promotion: 'q' });

    // 1. Checks
    if (tempGame.inCheck()) {
      checks.push(move);
      continue;
    }

    // 2. Captures
    if (move.captured || move.san.includes('x')) {
      captures.push(move);
      continue;
    }

    // 3. Threats (Attacks an opponent piece that was undefended or of higher value)
    let isThreat = false;
    const opponentColor = activeColor === 'w' ? 'b' : 'w';
    const board = tempGame.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === opponentColor) {
          const square = `${String.fromCharCode(97 + c)}${8 - r}`;
          
          // Check if it's attacked by us now
          const isAttackedNow = tempGame.isAttacked(square, activeColor);
          const wasAttackedBefore = chess.isAttacked(square, activeColor);

          if (isAttackedNow) {
            // Is it a threat? Yes if:
            // - It wasn't attacked before
            // - Or it is a higher value piece than the attacking piece
            const targetVal = pieceValues[piece.type];
            const attackerVal = pieceValues[move.piece];
            if (!wasAttackedBefore || targetVal > attackerVal) {
              isThreat = true;
              move.threatenedSquare = square;
              break;
            }
          }
        }
      }
      if (isThreat) break;
    }

    if (isThreat) {
      threats.push(move);
    } else {
      // 4. Plans / Pawn Breaks (Pawn pushes, developing pieces, controlling center)
      plans.push(move);
    }
  }

  return { checks, captures, threats, plans };
}
