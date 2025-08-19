function solveSudoku(board) {
  const emptySpot = findEmptySpot(board);
  if (!emptySpot) {
    return true; // Solved
  }

  const [row, col] = emptySpot;

  for (let num = 1; num <= 9; num++) {
    if (isValid(board, num, row, col)) {
      board[row][col] = num;

      if (solveSudoku(board)) {
        return true;
      }

      board[row][col] = 0; // Reset on backtrack
    }
  }

  return false; // Trigger backtracking
}

function findEmptySpot(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        return [row, col]; // Return the row and column of the empty spot
      }
    }
  }
  return null; // No empty spots
}

function isValid(board, num, row, col) {
  // Check row
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) {
      return false;
    }
  }

  // Check column
  for (let i = 0; i < 9; i++) {
    if (board[i][col] === num) {
      return false;
    }
  }

  // Check 3x3 box
  const boxRowStart = Math.floor(row / 3) * 3;
  const boxColStart = Math.floor(col / 3) * 3;

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[boxRowStart + i][boxColStart + j] === num) {
        return false;
      }
    }
  }

  return true; // Valid placement
}

export { solveSudoku };