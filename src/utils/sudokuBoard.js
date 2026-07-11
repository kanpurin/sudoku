export const BOARD_SIZE = 9;
export const BOX_SIZE = 3;
export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const DEFAULT_BOARD = [
    [8, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 3, 6, 0, 0, 0, 0, 0],
    [0, 7, 0, 0, 9, 0, 2, 0, 0],
    [0, 5, 0, 0, 0, 7, 0, 0, 0],
    [0, 0, 0, 0, 4, 5, 7, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 3, 0],
    [0, 0, 1, 0, 0, 0, 0, 6, 8],
    [0, 0, 8, 5, 0, 0, 0, 1, 0],
    [0, 9, 0, 0, 0, 0, 4, 0, 0]
];

export const createGivenFromBoard = (board) =>
    board.map(row => row.map(cell => cell !== 0));

export const cloneBoard = (board) => board.map(row => [...row]);

export const createEmptyNotes = () =>
    Array.from({ length: BOARD_SIZE }, () =>
        Array.from({ length: BOARD_SIZE }, () => new Set())
    );

export const cloneNotes = (notes) =>
    notes.map(row => row.map(cellNotes => new Set(cellNotes)));

export const createEmptyColors = () =>
    Array.from({ length: BOARD_SIZE }, () =>
        Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE + 1).fill(0))
    );

export const serializeNotes = (notes) =>
    notes.map(row => row.map(cellNotes => Array.from(cellNotes)));

export const deserializeNotes = (notes) =>
    notes.map(row => row.map(cellNotes => new Set(cellNotes)));

export const formatGivenBoard = (board, given) =>
    board.map((row, rowIndex) =>
        row.map((cellValue, colIndex) =>
            given[rowIndex][colIndex] ? cellValue : 0
        ).join('')
    ).join('\n');

export const parseBoardInput = (input) => {
    const cleanedString = input.replace(/\s/g, '');

    if (cleanedString.length !== 0 && cleanedString.length !== BOARD_SIZE * BOARD_SIZE) {
        return {
            error: `入力は81文字の数字でなければなりません。現在の文字数: ${cleanedString.length}`
        };
    }

    const board = [];
    const given = [];
    let index = 0;

    for (let rowIndex = 0; rowIndex < BOARD_SIZE; rowIndex++) {
        const row = [];
        const givenRow = [];

        for (let colIndex = 0; colIndex < BOARD_SIZE; colIndex++) {
            const char = cleanedString.length === 0 ? '0' : cleanedString[index];
            const num = parseInt(char, 10);

            if (Number.isNaN(num) || num < 0 || num > 9) {
                return { error: '入力が無効です。0-9の数字のみを使用してください。' };
            }

            row.push(num);
            givenRow.push(num !== 0);
            index++;
        }

        board.push(row);
        given.push(givenRow);
    }

    return { board, given };
};

export const eliminateNotesForPlacedNumber = (notes, rowIndex, colIndex, number) => {
    for (let col = 0; col < BOARD_SIZE; col++) {
        if (col !== colIndex) {
            notes[rowIndex][col].delete(number);
        }
    }

    for (let row = 0; row < BOARD_SIZE; row++) {
        if (row !== rowIndex) {
            notes[row][colIndex].delete(number);
        }
    }

    const startRow = Math.floor(rowIndex / BOX_SIZE) * BOX_SIZE;
    const startCol = Math.floor(colIndex / BOX_SIZE) * BOX_SIZE;
    for (let row = startRow; row < startRow + BOX_SIZE; row++) {
        for (let col = startCol; col < startCol + BOX_SIZE; col++) {
            if (row !== rowIndex || col !== colIndex) {
                notes[row][col].delete(number);
            }
        }
    }

    return notes;
};

export const getPossibleNumbers = (board, rowIndex, colIndex) => {
    const possibleNumbers = new Set(DIGITS);

    for (let col = 0; col < BOARD_SIZE; col++) {
        possibleNumbers.delete(board[rowIndex][col]);
    }

    for (let row = 0; row < BOARD_SIZE; row++) {
        possibleNumbers.delete(board[row][colIndex]);
    }

    const startRow = Math.floor(rowIndex / BOX_SIZE) * BOX_SIZE;
    const startCol = Math.floor(colIndex / BOX_SIZE) * BOX_SIZE;
    for (let row = startRow; row < startRow + BOX_SIZE; row++) {
        for (let col = startCol; col < startCol + BOX_SIZE; col++) {
            possibleNumbers.delete(board[row][col]);
        }
    }

    return possibleNumbers;
};

export const buildAutoNotes = (board) => {
    const notes = createEmptyNotes();

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === 0) {
                notes[row][col] = getPossibleNumbers(board, row, col);
            }
        }
    }

    return notes;
};

const findSingleCandidateInUnit = (board, notes, unitCells, number) => {
    const foundCells = unitCells.filter(({ row, col }) =>
        board[row][col] === 0 && notes[row][col].has(number)
    );

    return foundCells.length === 1 ? foundCells[0] : null;
};

const getRowCells = (row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({ row, col }));

const getColCells = (col) =>
    Array.from({ length: BOARD_SIZE }, (_, row) => ({ row, col }));

const getBoxCells = (boxRow, boxCol) => {
    const cells = [];
    const startRow = boxRow * BOX_SIZE;
    const startCol = boxCol * BOX_SIZE;

    for (let row = startRow; row < startRow + BOX_SIZE; row++) {
        for (let col = startCol; col < startCol + BOX_SIZE; col++) {
            cells.push({ row, col });
        }
    }

    return cells;
};

export const fillSingles = (board, notes) => {
    let changed = false;
    let cellsUpdatedInLoop = false;
    let nextBoard = cloneBoard(board);
    let nextNotes = cloneNotes(notes);

    do {
        cellsUpdatedInLoop = false;

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (nextBoard[row][col] === 0 && nextNotes[row][col].size === 1) {
                    const numberToFill = Array.from(nextNotes[row][col])[0];
                    nextBoard[row][col] = numberToFill;
                    nextNotes[row][col].clear();
                    nextNotes = eliminateNotesForPlacedNumber(nextNotes, row, col, numberToFill);
                    cellsUpdatedInLoop = true;
                    changed = true;
                }
            }
        }

        for (const number of DIGITS) {
            for (let row = 0; row < BOARD_SIZE; row++) {
                const cell = findSingleCandidateInUnit(nextBoard, nextNotes, getRowCells(row), number);
                if (cell) {
                    nextBoard[cell.row][cell.col] = number;
                    nextNotes[cell.row][cell.col].clear();
                    nextNotes = eliminateNotesForPlacedNumber(nextNotes, cell.row, cell.col, number);
                    cellsUpdatedInLoop = true;
                    changed = true;
                }
            }

            for (let col = 0; col < BOARD_SIZE; col++) {
                const cell = findSingleCandidateInUnit(nextBoard, nextNotes, getColCells(col), number);
                if (cell) {
                    nextBoard[cell.row][cell.col] = number;
                    nextNotes[cell.row][cell.col].clear();
                    nextNotes = eliminateNotesForPlacedNumber(nextNotes, cell.row, cell.col, number);
                    cellsUpdatedInLoop = true;
                    changed = true;
                }
            }

            for (let boxRow = 0; boxRow < BOX_SIZE; boxRow++) {
                for (let boxCol = 0; boxCol < BOX_SIZE; boxCol++) {
                    const cell = findSingleCandidateInUnit(nextBoard, nextNotes, getBoxCells(boxRow, boxCol), number);
                    if (cell) {
                        nextBoard[cell.row][cell.col] = number;
                        nextNotes[cell.row][cell.col].clear();
                        nextNotes = eliminateNotesForPlacedNumber(nextNotes, cell.row, cell.col, number);
                        cellsUpdatedInLoop = true;
                        changed = true;
                    }
                }
            }
        }
    } while (cellsUpdatedInLoop);

    return { board: nextBoard, notes: nextNotes, changed };
};

const duplicateMessage = (unitName, number) =>
    `${unitName} に数字 ${number} が重複しています。`;

export const validateCompletedBoard = (board) => {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const value = board[row][col];
            if (value === 0) {
                return { ok: false, message: `行 ${row + 1}, 列 ${col + 1} が空です。` };
            }

            const currentBoard = cloneBoard(board);
            currentBoard[row][col] = 0;

            for (let index = 0; index < BOARD_SIZE; index++) {
                if (currentBoard[row][index] === value) {
                    return { ok: false, message: duplicateMessage(`行 ${row + 1}`, value) };
                }

                if (currentBoard[index][col] === value) {
                    return { ok: false, message: duplicateMessage(`列 ${col + 1}`, value) };
                }
            }

            const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
            const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
            for (let boxRow = startRow; boxRow < startRow + BOX_SIZE; boxRow++) {
                for (let boxCol = startCol; boxCol < startCol + BOX_SIZE; boxCol++) {
                    if (currentBoard[boxRow][boxCol] === value) {
                        return {
                            ok: false,
                            message: duplicateMessage(`ブロック (${startRow / BOX_SIZE + 1}, ${startCol / BOX_SIZE + 1})`, value)
                        };
                    }
                }
            }
        }
    }

    return { ok: true, message: '正解！' };
};

export const buildMemoFromNotes = (notes) => {
    const memo = Array.from({ length: BOARD_SIZE }, () =>
        Array.from({ length: BOARD_SIZE }, () =>
            Array(BOARD_SIZE).fill(false)
        )
    );

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            notes[row][col].forEach(number => {
                memo[row][col][number - 1] = true;
            });
        }
    }

    return memo;
};
