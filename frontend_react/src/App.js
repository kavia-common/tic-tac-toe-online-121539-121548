import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
 * Utility helpers for AI.
 */
function emptyIndices(squares) {
  const res = [];
  for (let i = 0; i < squares.length; i++) {
    if (!squares[i]) res.push(i);
  }
  return res;
}

function isDrawBoard(squares) {
  return emptyIndices(squares).length === 0 && !calculateWinner(squares).winner;
}

/**
 * Minimax algorithm: 'O' is the AI (maximizing player), 'X' is human (minimizing).
 * Returns the score for a given board state.
 */
function minimax(squares, depth, isMaximizing) {
  const { winner } = calculateWinner(squares);
  if (winner === 'O') return 10 - depth; // prefer faster wins
  if (winner === 'X') return depth - 10; // prefer slower losses
  if (isDrawBoard(squares)) return 0;

  const moves = emptyIndices(squares);

  if (isMaximizing) {
    let best = -Infinity;
    for (const idx of moves) {
      squares[idx] = 'O';
      const score = minimax(squares, depth + 1, false);
      squares[idx] = null;
      if (score > best) best = score;
    }
    return best;
  } else {
    let best = Infinity;
    for (const idx of moves) {
      squares[idx] = 'X';
      const score = minimax(squares, depth + 1, true);
      squares[idx] = null;
      if (score < best) best = score;
    }
    return best;
  }
}

/**
 * Finds the best move for AI ('O') using minimax.
 * @param {Array<string|null>} squares
 * @returns {number} best move index
 */
function findBestMove(squares) {
  const moves = emptyIndices(squares);
  let bestScore = -Infinity;
  let bestIndex = moves[0] ?? 0;

  // Small optimization: choose center if available
  if (squares[4] === null) return 4;

  for (const idx of moves) {
    squares[idx] = 'O';
    const score = minimax(squares, 0, false);
    squares[idx] = null;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = idx;
    }
  }
  return bestIndex;
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
function Board({ squares, onPlay, winningLine, gameOver, disableAll = false }) {
  return (
    <div className="board" role="grid" aria-label="Tic Tac Toe board">
      {squares.map((sq, i) => (
        <Square
          key={i}
          value={sq}
          onClick={() => onPlay(i)}
          index={i}
          disabled={Boolean(sq) || gameOver || disableAll}
          highlight={winningLine?.includes(i)}
        />
      ))}
    </div>
  );
}

/**
 * Renders board as text for prompting.
 */
function renderBoardText(squares) {
  const cell = (i) => squares[i] ?? '.';
  return `${cell(0)}|${cell(1)}|${cell(2)}
-+-+-
${cell(3)}|${cell(4)}|${cell(5)}
-+-+-
${cell(6)}|${cell(7)}|${cell(8)}`;
}

/**
 * Generate a playful default trash-talk in case OpenAI is unavailable.
 */
function fallbackTrashTalk() {
  const lines = [
    "Did you just blink? I made a move while you were daydreaming.",
    "Strategic silence... and a devastating 'O'.",
    "I'm not saying I'm good, but checkmate—uh, wrong game. Still counts.",
    "Another step in my unstoppable march to victory.",
    "Oops, I did it again. Placed an 'O' and stole the show.",
    "You set 'em up, I knock 'em down. Classic combo.",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

/**
 * Sends a chat completion request to OpenAI for playful trash-talk after AI's move.
 * Uses REACT_APP_OPENAI_API_KEY from environment variables.
 * Handles errors gracefully and falls back to a local quip.
 */
async function fetchTrashTalkFromOpenAI({ board, lastMoveIndex, outcome }) {
  const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
  const position = `Row ${Math.floor(lastMoveIndex / 3) + 1}, Col ${lastMoveIndex % 3 + 1}`;
  const system = "You are a playful, witty Tic Tac Toe AI named O-bot. You speak in short, fun one-liners (max 20 words). Light-hearted, no insults.";
  const outcomeLine = outcome ? `Outcome so far: ${outcome}.` : '';
  const user = `We are playing Tic Tac Toe. You (O) just moved at ${position}.
Board now:
${renderBoardText(board)}
${outcomeLine}
Respond with a single playful one-liner trash-talk.`;

  // If the key is not present, return a fallback line
  if (!OPENAI_API_KEY) {
    return { text: fallbackTrashTalk(), source: 'fallback' };
  }

  // Abort after timeout to avoid hanging UI
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        max_tokens: 50,
        temperature: 0.9,
        n: 1,
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      // Handle API error status
      return { text: fallbackTrashTalk(), source: `error:${res.status}` };
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { text: fallbackTrashTalk(), source: 'empty' };
    }
    return { text, source: 'openai' };
  } catch (err) {
    clearTimeout(timeout);
    return { text: fallbackTrashTalk(), source: 'exception' };
  }
}

// PUBLIC_INTERFACE
function App() {
  /** Main application rendering a modern, minimalistic Tic Tac Toe game UI with single-player AI and playful chat. */
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [mode, setMode] = useState('two'); // 'two' | 'single'
  const [aiThinking, setAiThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'system', text: 'Welcome! Switch to Single Player to face O-bot, the playful AI.', ts: Date.now() }
  ]);

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
    if (mode === 'single') {
      return xIsNext ? 'Your turn (X)' : 'AI thinking... (O)';
    }
    return `Current Player: ${xIsNext ? 'X' : 'O'}`;
  }, [winner, isDraw, xIsNext, mode]);

  // PUBLIC_INTERFACE
  const resetGame = useCallback(() => {
    /** Reset the game to its initial state. */
    setSquares(Array(9).fill(null));
    setXIsNext(true);
    setAiThinking(false);
    setChatMessages((prev) => [
      ...prev,
      { role: 'system', text: 'New game started.', ts: Date.now() }
    ]);
  }, []);

  function pushChat(role, text) {
    setChatMessages((prev) => [...prev, { role, text, ts: Date.now() }]);
  }

  function handlePlay(index) {
    if (squares[index] || winner) return;

    // In single-player, ignore clicks if not human's turn
    if (mode === 'single' && !xIsNext) return;

    const next = squares.slice();
    next[index] = xIsNext ? 'X' : 'O';
    setSquares(next);
    setXIsNext(!xIsNext);
  }

  // Trigger AI move when it's AI's turn in single-player
  useEffect(() => {
    if (mode !== 'single') return;
    if (winner || isDraw) return;
    if (xIsNext === true) return; // human's turn

    // AI to move
    setAiThinking(true);

    // small delay for UX
    const timer = setTimeout(() => {
      const next = squares.slice();
      const idx = findBestMove(next);
      next[idx] = 'O';
      setSquares(next);
      setXIsNext(true);
      setAiThinking(false);

      // Ask OpenAI for playful trash-talk
      const outcome = calculateWinner(next).winner
        ? `You (${calculateWinner(next).winner === 'O' ? 'lost' : 'won'})`
        : isDrawBoard(next) ? 'Potential draw' : '';
      fetchTrashTalkFromOpenAI({ board: next, lastMoveIndex: idx, outcome })
        .then((res) => {
          // res: { text, source }
          pushChat('ai', res.text);
          if (res.source && res.source.startsWith('error')) {
            // Append note quietly for debugging context (non-intrusive)
            pushChat('system', 'AI used a local quip due to API issue.');
          }
        })
        .catch(() => {
          // Should not happen due to internal try/catch, but guard anyway
          pushChat('ai', fallbackTrashTalk());
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [mode, xIsNext, winner, isDraw, squares]);

  const disableAll = useMemo(
    () => Boolean(winner) || isDraw || (mode === 'single' && (!xIsNext || aiThinking)),
    [winner, isDraw, mode, xIsNext, aiThinking]
  );

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">Tic Tac Toe</h1>
        <p className={`status ${winner ? 'status--win' : isDraw ? 'status--draw' : ''}`}>
          {statusMessage}
        </p>
      </header>

      <main className="container">
        <div className="toolbar" role="group" aria-label="Game controls">
          <label className="mode-label" htmlFor="mode-select">Mode:</label>
          <select
            id="mode-select"
            className="mode-select"
            value={mode}
            onChange={(e) => {
              const newMode = e.target.value;
              setMode(newMode);
              // If switching modes mid-game, keep board; AI may move automatically if it's AI's turn.
              if (newMode === 'single') {
                setChatMessages((prev) => [
                  ...prev,
                  { role: 'system', text: 'Single Player enabled. You are X; O-bot is your rival.', ts: Date.now() }
                ]);
              } else {
                setChatMessages((prev) => [
                  ...prev,
                  { role: 'system', text: 'Two Player mode enabled.', ts: Date.now() }
                ]);
              }
            }}
            aria-label="Game mode"
          >
            <option value="two">Two Players (local)</option>
            <option value="single">Single Player vs AI</option>
          </select>
        </div>

        <Board
          squares={squares}
          onPlay={handlePlay}
          winningLine={winningLine}
          gameOver={Boolean(winner) || isDraw}
          disableAll={disableAll}
        />

        <div className="controls">
          <button className="btn-reset" onClick={resetGame} aria-label="Reset Game">
            Reset Game
          </button>
        </div>

        <section className="chat" aria-live="polite" role="log" aria-label="AI Trash Talk">
          <h2 className="chat-title">Trash Talk</h2>
          <div className="chat-messages">
            {chatMessages.map((m, i) => (
              <div
                key={`${m.ts}-${i}`}
                className={`chat-message chat-message--${m.role}`}
              >
                <span className="chat-role">
                  {m.role === 'ai' ? 'O-bot' : m.role === 'user' ? 'You' : 'System'}
                </span>
                <span className="chat-text">{m.text}</span>
              </div>
            ))}
            {aiThinking && (
              <div className="chat-message chat-message--ai" aria-label="AI is typing">
                <span className="chat-role">O-bot</span>
                <span className="chat-text">Thinking...</span>
              </div>
            )}
          </div>
        </section>
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
