/*
 * A simple chess AI, by someone who doesn't know how to play chess.
 * Uses the chessboard.js and chess.js libraries.
 *
 * Copyright (c) 2020 Zhang Zeyu
 */

var STACK_SIZE = 100; // maximum size of undo stack

var board = null;
var $board = $('#myBoard');
var game = new Chess();
var globalSum = 0; // always from black's perspective. Negative for white's perspective.
var whiteSquareGrey = '#a9a9a9';
var blackSquareGrey = '#696969';

opening_book = {
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1": {
      "e2e4": {
          "e7e5": {
              "f1c4": {
                  "c7c5": {
                      "g1f3": {
                          "g7g6": {
                              "d2d4": 1
                          }
                      }
                  }
              }
          }
      }
  },
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1": {
      "e7e5": {
          "f1c4": {
              "c7c5": {
                  "g1f3": {
                      "g7g6": {
                          "d2d4": 1
                      }
                  }
              }
          }
      }
  }
}

var squareClass = 'square-55d63';
var squareToHighlight = null;
var colorToHighlight = null;
var positionCount;

var config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onMouseoutSquare: onMouseoutSquare,
  onMouseoverSquare: onMouseoverSquare,
  onSnapEnd: onSnapEnd,
};
board = Chessboard('myBoard', config);

timer = null;

/*
 * Piece Square Tables, adapted from Sunfish.py:
 * https://github.com/thomasahle/sunfish/blob/master/sunfish.py
 */

var weights = { p: 100, n: 280, b: 320, r: 479, q: 929, k: 60000, k_e: 60000 };

var pst_w = {
  p: [
    [100, 100, 100, 100, 105, 100, 100, 100],
    [78, 83, 86, 73, 102, 82, 85, 90],
    [7, 29, 21, 44, 40, 31, 44, 7],
    [-17, 16, -2, 15, 14, 0, 15, -13],
    [-26, 3, 10, 9, 6, 1, 0, -23],
    [-22, 9, 15, 16, 16, -2, 3, -19],
    [-31, 8, -7, -37, -36, -14, 3, -31],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  n: [
    [-66, -53, -75, -75, -10, -55, -58, -70],
    [-3, -6, 100, -36, 4, 62, -4, -14],
    [10, 67, 1, 74, 73, 27, 62, -2],
    [24, 24, 45, 37, 33, 41, 25, 17],
    [-1, 5, 31, 21, 22, 35, 2, 0],
    [-18, 10, 13, 22, 18, 15, 11, -14],
    [-23, -15, 2, 0, 2, 0, -23, -20],
    [-74, -23, -26, -24, -19, -35, -22, -69],
  ],
  b: [
    [-59, -78, -82, -76, -23, -107, -37, -50],
    [-11, 20, 35, -42, -39, 31, 2, -22],
    [-9, 39, -32, 41, 52, -10, 28, -14],
    [25, 17, 20, 34, 26, 25, 15, 10],
    [13, 10, 17, 23, 17, 16, 0, 7],
    [14, 25, 24, 15, 8, 25, 20, 15],
    [19, 20, 11, 6, 7, 6, 20, 16],
    [-7, 2, -15, -12, -14, -15, -10, -10],
  ],
  r: [
    [35, 29, 33, 4, 37, 33, 56, 50],
    [55, 29, 56, 67, 55, 62, 34, 60],
    [19, 35, 28, 33, 45, 27, 25, 15],
    [0, 5, 16, 13, 18, -4, -9, -6],
    [-28, -35, -16, -21, -13, -29, -46, -30],
    [-42, -28, -42, -25, -25, -35, -26, -46],
    [-53, -38, -31, -26, -29, -43, -44, -53],
    [-30, -24, -18, 5, -2, -18, -31, -32],
  ],
  q: [
    [6, 1, -8, -104, 69, 24, 88, 26],
    [14, 32, 60, -10, 20, 76, 57, 24],
    [-2, 43, 32, 60, 72, 63, 43, 2],
    [1, -16, 22, 17, 25, 20, -13, -6],
    [-14, -15, -2, -5, -1, -10, -20, -22],
    [-30, -6, -13, -11, -16, -11, -16, -27],
    [-36, -18, 0, -19, -15, -15, -21, -38],
    [-39, -30, -31, -13, -31, -36, -34, -42],
  ],
  k: [
    [4, 54, 47, -99, -99, 60, 83, -62],
    [-32, 10, 55, 56, 56, 55, 10, 3],
    [-62, 12, -57, 44, -67, 28, 37, -31],
    [-55, 50, 11, -4, -19, 13, 0, -49],
    [-55, -43, -52, -28, -51, -47, -8, -50],
    [-47, -42, -43, -79, -64, -32, -29, -32],
    [-4, 3, -14, -50, -57, -18, 13, 4],
    [17, 30, -3, -14, 6, -1, 40, 18],
  ],

  // Endgame King Table
  k_e: [
    [-50, -40, -30, -20, -20, -30, -40, -50],
    [-30, -20, -10, 0, 0, -10, -20, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 30, 40, 40, 30, -10, -30],
    [-30, -10, 20, 30, 30, 20, -10, -30],
    [-30, -30, 0, 0, 0, 0, -30, -30],
    [-50, -30, -30, -30, -30, -30, -30, -50],
  ],
};

function randomizePST(pst, range = 5) {
  // Create a deep copy of the pst object to avoid modifying the original
  let newPST = JSON.parse(JSON.stringify(pst));
  
  // Iterate over each piece type in the pst
  for (let piece in newPST) {
    for (let row = 0; row < newPST[piece].length; row++) {
      for (let col = 0; col < newPST[piece][row].length; col++) {
        // Generate a small random number in the range [-range, range]
        let randomChange = Math.floor(Math.random() * (2 * range + 1)) - range;
        // Apply the change to the current value
        newPST[piece][row][col] += randomChange;
      }
    }
  }
  return newPST;
}

pst_w = randomizePST(pst_w, 3);  // Adjust range as needed

var pst_b = {
  p: pst_w['p'].slice().reverse(),
  n: pst_w['n'].slice().reverse(),
  b: pst_w['b'].slice().reverse(),
  r: pst_w['r'].slice().reverse(),
  q: pst_w['q'].slice().reverse(),
  k: pst_w['k'].slice().reverse(),
  k_e: pst_w['k_e'].slice().reverse(),
};

var pstOpponent = { w: pst_b, b: pst_w };
var pstSelf = { w: pst_w, b: pst_b };

// Killer moves table: Two entries per depth level
let killerMoves = Array.from({ length: maxDepth }, () => [null, null]);

// Function to update killer moves
function updateKillerMoves(move, depth) {
  // If the move is already in the killer moves, do nothing
  if (killerMoves[depth][0] === move || killerMoves[depth][1] === move) return;
  
  // Otherwise, replace the oldest killer move
  killerMoves[depth][1] = killerMoves[depth][0];
  killerMoves[depth][0] = move;
}

// MVV-LVA heuristic table (simplified example)
const MVV_LVA = {
  "p": 1, "n": 3, "b": 3, "r": 5, "q": 9, "k": 100,
};

// History table to track move success across searches
let historyTable = {};  // e.g., historyTable[move] = score;

// Function to score moves for ordering
function scoreMove(move, depth) {
  // Score capture moves using MVV-LVA
  if (move.isCapture) {
    return MVV_LVA[move.capturedPiece] - MVV_LVA[move.movingPiece];
  }
  // Prioritize killer moves
  if (killerMoves[depth] && killerMoves[depth].includes(move)) {
    return 200;
  }
  // Use history heuristic as a fallback
  return historyTable[move] || 0;
}

// Move ordering function
function orderMoves(moves, killerMoves, depth) {
  moves.sort((a, b) => scoreMove(b, killerMoves, depth) - scoreMove(a, killerMoves, depth));
  return moves;
}


/*
 * Evaluates the board at this point in time,
 * using the material weights and piece square tables.
 */
function isPassedPawn(game, position, color) {
  const file = position[1];
  const rank = position[0];
  const directions = color === 'w' ? 1 : -1; // White pawns move up, black pawns move down
  
  for (let i = -1; i <= 1; i++) {  // Check the file and adjacent files
    const adjFile = file + i;
    if (adjFile < 0 || adjFile > 7) continue; // Ignore out-of-bounds files
    
    // Scan ranks ahead of the pawn in the same column or adjacent columns
    for (let r = rank + directions; r >= 0 && r <= 7; r += directions) {
      const piece = game.get(r, adjFile);
      if (piece && piece.type === 'p' && piece.color !== color) {
        return false; // Opponent pawn is blocking or can block this pawn
      }
    }
  }
  return true;
}

function evaluateBoard(game, move, prevSum, color) {
  if (game.in_checkmate()) {
    return move.color === color ? 10 ** 10 : -(10 ** 10);
  }
  
  if (game.in_draw() || game.in_threefold_repetition() || game.in_stalemate()) {
    return 0;
  }

  if (game.in_check()) {
    prevSum += move.color === color ? 5 : -5;
  }

  const from = [8 - parseInt(move.from[1]), move.from.charCodeAt(0) - 'a'.charCodeAt(0)];
  const to = [8 - parseInt(move.to[1]), move.to.charCodeAt(0) - 'a'.charCodeAt(0)];

  if (prevSum < -1500 && move.piece === 'k') {
    move.piece = 'k_e';
  }

  if ('captured' in move) {
    if (move.color === color) {
      prevSum += weights[move.captured] + pstOpponent[move.color][move.captured][to[0]][to[1]];
    } else {
      prevSum -= weights[move.captured] + pstSelf[move.color][move.captured][to[0]][to[1]];
    }
  }

  if (move.flags.includes('p')) {
    move.promotion = 'q';
    if (move.color === color) {
      prevSum -= weights[move.piece] + pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum += weights[move.promotion] + pstSelf[move.color][move.promotion][to[0]][to[1]];
    } else {
      prevSum += weights[move.piece] + pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum -= weights[move.promotion] + pstSelf[move.color][move.promotion][to[0]][to[1]];
    }
  } else {
    if (move.color !== color) {
      prevSum += pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum -= pstSelf[move.color][move.piece][to[0]][to[1]];
    } else {
      prevSum -= pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum += pstSelf[move.color][move.piece][to[0]][to[1]];
    }
  }

  // Passed pawn evaluation
  if (move.piece === 'p') {
    const isPassed = isPassedPawn(game, to, move.color);
    if (isPassed) {
      prevSum += move.color === color ? 20 : -20;  // Adjust the value based on your preference
    }
  }

  return prevSum;
}


/*
 * Performs the minimax algorithm to choose the best move: https://en.wikipedia.org/wiki/Minimax (pseudocode provided)
 * Recursively explores all possible moves up to a given depth, and evaluates the game board at the leaves.
 *
 * Basic idea: maximize the minimum value of the position resulting from the opponent's possible following moves.
 * Optimization: alpha-beta pruning: https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning (pseudocode provided)
 *
 * Inputs:
 *  - game:                 the game object.
 *  - depth:                the depth of the recursive tree of all possible moves (i.e. height limit).
 *  - isMaximizingPlayer:   true if the current layer is maximizing, false otherwise.
 *  - sum:                  the sum (evaluation) so far at the current layer.
 *  - color:                the color of the current player.
 *
 * Output:
 *  the best move at the root of the current subtree.
 */

function minimax(game, depth, alpha, beta, isMaximizingPlayer, sum, color) {

  const fen = game.fen();
    if (fen in opening_book) {
        const currentColor = game.turn();
        const bookColor = fen.split(' ')[1]; // Extract color from FEN

        if (currentColor === bookColor) {
            const bestMove = opening_book[fen];
            return [bestMove, evaluateBoard(game, bestMove, currSum, color)];
        }
    }

  positionCount++;
  var children = game.ugly_moves({ verbose: true });
  children = orderMoves(children, killerMoves, depth);
  // Maximum depth exceeded or node is a terminal node (no children)
  if (depth <= 0 || children.length === 0) {
    return [null, sum];
  }

  // Find maximum/minimum from list of 'children' (possible moves)
  var maxValue = Number.NEGATIVE_INFINITY;
  var minValue = Number.POSITIVE_INFINITY;
  var bestMove;
  for (var i = 0; i < children.length; i++) {
    let currMove = children[i];

    var currPrettyMove = game.ugly_move(currMove);
    var newSum = evaluateBoard(game, currPrettyMove, sum, color);
    var [childBestMove, childValue] = minimax(
      game,
      depth - 1,
      alpha,
      beta,
      !isMaximizingPlayer,
      newSum,
      color
    );

    game.undo();

    if (isMaximizingPlayer) {
      if (childValue > maxValue) {
        maxValue = childValue;
        bestMove = currPrettyMove;
      }
      if (childValue > alpha) {
        alpha = childValue;
      }
    } else {
      if (childValue < minValue) {
        minValue = childValue;
        bestMove = currPrettyMove;
      }
      if (childValue < beta) {
        updateKillerMoves(move, depth);
        beta = childValue;
      }
    }

    // Alpha-beta pruning
    if (alpha >= beta) {
      break;
    }
  }
  
  if (isMaximizingPlayer) {
    return [bestMove, maxValue];
  } else {
    return [bestMove, minValue];
  }
}

function checkStatus(color) {
  if (game.in_checkmate()) {
    $('#status').html(`<b>Checkmate!</b> Oops, <b>${color}</b> lost.`);
  } else if (game.insufficient_material()) {
    $('#status').html(`It's a <b>draw!</b> (Insufficient Material)`);
  } else if (game.in_threefold_repetition()) {
    $('#status').html(`It's a <b>draw!</b> (Threefold Repetition)`);
  } else if (game.in_stalemate()) {
    $('#status').html(`It's a <b>draw!</b> (Stalemate)`);
  } else if (game.in_draw()) {
    $('#status').html(`It's a <b>draw!</b> (50-move Rule)`);
  } else if (game.in_check()) {
    $('#status').html(`Oops, <b>${color}</b> is in <b>check!</b>`);
    return false;
  } else {
    $('#status').html(`No check, checkmate, or draw.`);
    return false;
  }
  return true;
}

function updateAdvantage() {
  if (globalSum > 0) {
    $('#advantageColor').text('Black');
    $('#advantageNumber').text(globalSum/100);
  } else if (globalSum < 0) {
    $('#advantageColor').text('White');
    $('#advantageNumber').text(-globalSum /100);
  } else {
    $('#advantageColor').text('Neither side');
    $('#advantageNumber').text(globalSum);
  }
  $('#advantageBar').attr({
    'aria-valuenow': `${-globalSum}`,
    style: `width: ${((-globalSum + 2000) / 4000) *100}%`,
  });
}

/*
 * Calculates the best legal move for the given color.
 */
function getBestMove(game, color, currSum) {
  positionCount = 0;

  if (color === 'b') {
    var depth = parseInt($('#search-depth').find(':selected').text());
  } else {
    var depth = parseInt($('#search-depth-white').find(':selected').text());
  }

  var d = new Date().getTime();
  var [bestMove, bestMoveValue] = minimax(
    game,
    depth,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    true,
    currSum,
    color
  );
  var d2 = new Date().getTime();
  var moveTime = d2 - d;
  var positionsPerS = (positionCount * 1000) / moveTime;

  $('#position-count').text(positionCount);
  $('#time').text(moveTime / 1000);
  $('#positions-per-s').text(Math.round(positionsPerS));

  return [bestMove, bestMoveValue];
}

/*
 * Makes the best legal move for the given color.
 */
function makeBestMove(color) {
  if (color === 'b') {
    var move = getBestMove(game, color, globalSum)[0];
  } else {
    var move = getBestMove(game, color, -globalSum)[0];
  }

  globalSum = evaluateBoard(game, move, globalSum, 'b');
  updateAdvantage();

  game.move(move);
  board.position(game.fen());

  if (color === 'b') {
    checkStatus('black');

    // Highlight black move
    $board.find('.' + squareClass).removeClass('highlight-black');
    $board.find('.square-' + move.from).addClass('highlight-black');
    squareToHighlight = move.to;
    colorToHighlight = 'black';

    $board
      .find('.square-' + squareToHighlight)
      .addClass('highlight-' + colorToHighlight);
  } else {
    checkStatus('white');

    // Highlight white move
    $board.find('.' + squareClass).removeClass('highlight-white');
    $board.find('.square-' + move.from).addClass('highlight-white');
    squareToHighlight = move.to;
    colorToHighlight = 'white';

    $board
      .find('.square-' + squareToHighlight)
      .addClass('highlight-' + colorToHighlight);
  }
}

/*
 * Plays Computer vs. Computer, starting with a given color.
 */
function compVsComp(color) {
  if (!checkStatus({ w: 'white', b: 'black' }[color])) {
    timer = window.setTimeout(function () {
      makeBestMove(color);
      if (color === 'w') {
        color = 'b';
      } else {
        color = 'w';
      }
      compVsComp(color);
    }, 250);
  }
}

/*
 * Resets the game to its initial state.
 */
function reset() {
  game.reset();
  globalSum = 0;
  $board.find('.' + squareClass).removeClass('highlight-white');
  $board.find('.' + squareClass).removeClass('highlight-black');
  $board.find('.' + squareClass).removeClass('highlight-hint');
  board.position(game.fen());
  $('#advantageColor').text('Neither side');
  $('#advantageNumber').text(globalSum);

  // Kill the Computer vs. Computer callback
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/*
 * Event listeners for various buttons.
 */
$('#ruyLopezBtn').on('click', function () {
  reset();
  game.load(
    'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1'
  );
  board.position(game.fen());
  window.setTimeout(function () {
    makeBestMove('b');
  }, 250);
});
$('#italianGameBtn').on('click', function () {
  reset();
  game.load(
    'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1'
  );
  board.position(game.fen());
  window.setTimeout(function () {
    makeBestMove('b');
  }, 250);
});
$('#sicilianDefenseBtn').on('click', function () {
  reset();
  game.load('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
  board.position(game.fen());
});
$('#startBtn').on('click', function () {
  reset();
});

$('#compVsCompBtn').on('click', function () {
  reset();
  compVsComp('w');
});
$('#resetBtn').on('click', function () {
  reset();
});

var undo_stack = [];

function undo() {
  var move = game.undo();
  undo_stack.push(move);

  // Maintain a maximum stack size
  if (undo_stack.length > STACK_SIZE) {
    undo_stack.shift();
  }
  board.position(game.fen());
}

$('#undoBtn').on('click', function () {
  alert("You thought")
});

function redo() {
  game.move(undo_stack.pop());
  board.position(game.fen());
}

$('#redoBtn').on('click', function () {
  alert("You thought")
});

$('#showHint').change(function () {
  alert("You thought")
});

function showHint() {
  var showHint = document.getElementById('showHint');
  $board.find('.' + squareClass).removeClass('highlight-hint');

  // Show hint (best move for white)
  if (showHint.checked) {
    var move = getBestMove(game, 'w', -globalSum)[0];

    $board.find('.square-' + move.from).addClass('highlight-hint');
    $board.find('.square-' + move.to).addClass('highlight-hint');
  }
}

/*
 * The remaining code is adapted from chessboard.js examples #5000 through #5005:
 * https://chessboardjs.com/examples#5000
 */
function removeGreySquares() {
  $('#myBoard .square-55d63').css('background', '');
}

function greySquare(square) {
  var $square = $('#myBoard .square-' + square);

  var background = whiteSquareGrey;
  if ($square.hasClass('black-3c85d')) {
    background = blackSquareGrey;
  }

  $square.css('background', background);
}

function onDragStart(source, piece) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false;

  // or if it's not that side's turn
  if (
    (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
    (game.turn() === 'b' && piece.search(/^w/) !== -1)
  ) {
    return false;
  }
}

function onDrop(source, target) {
  undo_stack = [];
  removeGreySquares();

  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q', // NOTE: always promote to a queen for example simplicity
  });

  // Illegal move
  if (move === null) return 'snapback';

  globalSum = evaluateBoard(game, move, globalSum, 'b');
  updateAdvantage();

  // Highlight latest move
  $board.find('.' + squareClass).removeClass('highlight-white');

  $board.find('.square-' + move.from).addClass('highlight-white');
  squareToHighlight = move.to;
  colorToHighlight = 'white';

  $board
    .find('.square-' + squareToHighlight)
    .addClass('highlight-' + colorToHighlight);

  if (!checkStatus('black'));
  {
    // Make the best move for black
    window.setTimeout(function () {
      makeBestMove('b');
      window.setTimeout(function () {
        showHint();
      }, 250);
    }, 250);
  }
}

function onMouseoverSquare(square, piece) {
  // get list of possible moves for this square
  var moves = game.moves({
    square: square,
    verbose: true,
  });

  // exit if there are no moves available for this square
  if (moves.length === 0) return;

  // highlight the square they moused over
  greySquare(square);

  // highlight the possible squares for this piece
  for (var i = 0; i < moves.length; i++) {
    greySquare(moves[i].to);
  }
}

function onMouseoutSquare(square, piece) {
  removeGreySquares();
}

function onSnapEnd() {
  board.position(game.fen());
}