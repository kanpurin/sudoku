import { render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    beginPath: jest.fn(),
    clearRect: jest.fn(),
    lineTo: jest.fn(),
    moveTo: jest.fn(),
    stroke: jest.fn()
  }));
});

test('renders sudoku controls', () => {
  const { container } = render(<App />);

  expect(container.querySelector('.board')).toBeInTheDocument();
  expect(container.querySelectorAll('.cell')).toHaveLength(81);
  expect(screen.getByText('N-fish')).toBeInTheDocument();
});
