import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

test('renders Tic Tac Toe title', () => {
  render(<App />);
  const title = screen.getByText(/tic tac toe/i);
  expect(title).toBeInTheDocument();
});

test('allows placing an X on first click', () => {
  render(<App />);
  const firstCell = screen.getByLabelText(/cell 1/i);
  fireEvent.click(firstCell);
  expect(firstCell).toHaveTextContent('X');
});

test('reset button clears the board', () => {
  render(<App />);
  const firstCell = screen.getByLabelText(/cell 1/i);
  fireEvent.click(firstCell); // X
  const reset = screen.getByRole('button', { name: /reset game/i });
  fireEvent.click(reset);
  expect(firstCell).toHaveTextContent('');
});
