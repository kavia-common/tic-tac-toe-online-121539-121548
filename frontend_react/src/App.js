import React, { useMemo, useState } from 'react';
import './App.css';

/**
 * Calculates the winner of the Tic Tac Toe game.
 * Returns an object with the winning player and the winning line indices, or nulls if none.
 * @param {Array<string|null>} squares - The current board values.
 * @returns {{winner: ('X'|'O'|null), line: number[]|null}}
 */
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], // rows
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6], // cols
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8], // diagonals
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: [a, b, c] };
    }
  }
  return { winner: null, line: null };
}

/**
 * Square component - a single cell in the board.
 */
function Square({ value, onClick, index, highlight, disabled }) {
  return (
    <button
      className={`square ${highlight ? 'square--highlight' : ''} ${value === 'X' ? 'square--x' : value === 'O' ? 'square--o' : ''}`}
      onClick={onClick}
      aria-label={`Cell ${index + 1}`}
      disabled={disabled}
    >
      {value}
    </button>
  );
}

/**
 * Board component - renders the 3x3 grid.
 */
function Board({ squares, onPlay, winningLine, gameOver }) {
  return (
    <div className="board" role="grid" aria-label="Tic Tac Toe board">
      {squares.map((sq, i) => (
        <Square
          key={i}
          value={sq}
          onClick={() => onPlay(i)}
          index={i}
          disabled={Boolean(sq) || gameOver}
          highlight={winningLine?.includes(i)}
        />
      ))}
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** Main application rendering a modern, minimalistic Tic Tac Toe game UI. */
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  const { winner, line: winningLine } = useMemo(
    () => calculateWinner(squares),
    [squares]
  );

  const isDraw = useMemo(
    () => squares.every(Boolean) && !winner,
    [squares, winner]
  );

  const statusMessage = useMemo(() => {
    if (winner) return `Winner: ${winner} 🎉`;
    if (isDraw) return "It's a draw 🤝";
    return `Current Player: ${xIsNext ? 'X' : 'O'}`;
  }, [winner, isDraw, xIsNext]);

  function handlePlay(index) {
    if (squares[index] || winner) return;
    const next = squares.slice();
    next[index] = xIsNext ? 'X' : 'O';
    setSquares(next);
    setXIsNext(!xIsNext);
  }

  // PUBLIC_INTERFACE
  function resetGame() {
    /** Reset the game to its initial state. */
    setSquares(Array(9).fill(null));
    setXIsNext(true);
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">Tic Tac Toe</h1>
        <p className={`status ${winner ? 'status--win' : isDraw ? 'status--draw' : ''}`}>
          {statusMessage}
        </p>
      </header>

      <main className="container">
        <Board
          squares={squares}
          onPlay={handlePlay}
          winningLine={winningLine}
          gameOver={Boolean(winner) || isDraw}
        />
        <div className="controls">
          <button className="btn-reset" onClick={resetGame} aria-label="Reset Game">
            Reset Game
          </button>
        </div>
      </main>

      <footer className="footer" aria-hidden="true">
        <span className="legend">
          X
          <span className="dot dot--primary" />
          O
          <span className="dot dot--secondary" />
        </span>
      </footer>
    </div>
  );
}

export default App;
