import { Chess } from 'chess.js';

const pieceNames = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King'
};

const squareNames = {
  a1: 'a1', b1: 'b1', c1: 'c1', d1: 'd1', e1: 'e1', f1: 'f1', g1: 'g1', h1: 'h1',
  a2: 'a2', b2: 'b2', c2: 'c2', d2: 'd2', e2: 'e2', f2: 'f2', g2: 'g2', h2: 'h2',
  a3: 'a3', b3: 'b3', c3: 'c3', d3: 'd3', e3: 'e3', f3: 'f3', g3: 'g3', h3: 'h3',
  a4: 'a4', b4: 'b4', c4: 'c4', d4: 'd4', e4: 'e4', f4: 'f4', g4: 'g4', h4: 'h4',
  a5: 'a5', b5: 'b5', c5: 'c5', d5: 'd5', e5: 'e5', f5: 'f5', g5: 'g5', h5: 'h5',
  a6: 'a6', b6: 'b6', c6: 'c6', d6: 'd6', e6: 'e6', f6: 'f6', g6: 'g6', h6: 'h6',
  a7: 'a7', b7: 'b7', c7: 'c7', d7: 'd7', e7: 'e7', f7: 'f7', g7: 'g7', h7: 'h7',
  a8: 'a8', b8: 'b8', c8: 'c8', d8: 'd8', e8: 'e8', f8: 'f8', g8: 'g8', h8: 'h8'
};

/**
 * Converts a chess move into a natural language sentence explaining its purpose.
 * @param {string} fen - The current FEN of the board before the move.
 * @param {object} move - The move object from chess.js (e.g. { from: 'e2', to: 'e4', san: 'e4', piece: 'p', color: 'w', flags: 'b' })
 * @returns {string} - A natural language explanation of the move.
 */
export function explainMove(fen, move, userColor = 'w') {
  if (!move) return "No move provided.";

  const game = new Chess(fen);
  const pieceName = pieceNames[move.piece];
  const toSquare = move.to;
  
  let explanationParts = [];

  const isOpponentMove = move.color !== userColor;
  const targetLabel = isOpponentMove ? 'your' : "the opponent's";

  // 1. Basic move description
  if (move.flags.includes('k') || move.san === 'O-O') {
    explanationParts.push(`Castles kingside to secure king safety and develop the rook.`);
  } else if (move.flags.includes('q') || move.san === 'O-O-O') {
    explanationParts.push(`Castles queenside to secure king safety and bring the rook to an active file.`);
  } else {
    explanationParts.push(`Moves the ${pieceName} to ${toSquare}.`);
  }

  // 2. Captures
  if (move.flags.includes('c') || move.flags.includes('e')) { // c = standard capture, e = en passant
    const capturedPiece = game.get(move.to);
    if (capturedPiece) {
       explanationParts.push(`This captures ${targetLabel} ${pieceNames[capturedPiece.type]}.`);
    } else if (move.flags.includes('e')) {
       explanationParts.push(`This is an en passant capture.`);
    } else {
       explanationParts.push(`This captures one of ${isOpponentMove ? 'your' : "the opponent's"} pieces.`);
    }
  }

  // 3. Checks
  if (move.san.includes('+')) {
    explanationParts.push(`This puts ${isOpponentMove ? 'your' : "the opponent's"} King in check, forcing a response.`);
  } else if (move.san.includes('#')) {
    explanationParts.push(isOpponentMove ? `This delivers checkmate against you!` : `This delivers checkmate, winning the game!`);
  }

  // 4. Promotions
  if (move.flags.includes('p') || move.promotion) {
    const promoPiece = pieceNames[move.promotion || 'q'];
    explanationParts.push(`The pawn is promoted to a ${promoPiece}.`);
  }

  // 5. Positional / Strategic concepts (very basic heuristic)
  const isCenterSquare = ['d4', 'e4', 'd5', 'e5'].includes(toSquare);
  if (move.piece === 'p' && isCenterSquare && !move.flags.includes('c')) {
    explanationParts.push(`This claims central space and controls important squares.`);
  }

  // Development (moving Knights or Bishops from their starting squares early in the game)
  const isDevelopment = (move.piece === 'n' || move.piece === 'b') && 
    (move.color === 'w' ? ['1', '2'].includes(move.from[1]) : ['7', '8'].includes(move.from[1]));
  
  if (isDevelopment && !move.flags.includes('c') && !move.san.includes('+')) {
    explanationParts.push(`This develops a minor piece to an active square, preparing for further action.`);
  }

  // If there are multiple parts, combine them nicely.
  // First sentence is the primary action. Subsequent sentences add context.
  if (explanationParts.length > 1) {
    // If it's a normal move followed by a capture, sometimes it's redundant.
    // e.g. "Moves the Knight to d4. This captures the opponent's Pawn."
    // It's acceptable for a simple explainer.
    return explanationParts.join(' ');
  }

  // If it's just a simple move with no extra tags, give a generic positive reason.
  if (explanationParts.length === 1 && !explanationParts[0].includes('Castles')) {
    explanationParts.push(`This improves the piece's position.`);
    return explanationParts.join(' ');
  }

  return explanationParts[0];
}
