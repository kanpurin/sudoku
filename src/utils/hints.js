import { BOARD_SIZE, BOX_SIZE, DIGITS } from './sudokuBoard';

const toBitmask = (notesSet) => {
    let mask = 0;
    notesSet.forEach(number => {
        mask |= (1 << (number - 1));
    });
    return mask;
};

export const toNumbers = (mask) => {
    const numbers = [];
    for (let index = 0; index < BOARD_SIZE; index++) {
        if ((mask >> index) & 1) {
            numbers.push(index + 1);
        }
    }
    return numbers;
};

const popcount = (mask) => {
    let count = 0;
    while (mask !== 0) {
        mask &= (mask - 1);
        count++;
    }
    return count;
};

const getCombinations = (array, size) => {
    const result = [];

    const visit = (prefix, remaining) => {
        if (prefix.length === size) {
            result.push(prefix);
            return;
        }

        if (remaining.length === 0) return;

        for (let index = 0; index < remaining.length; index++) {
            visit(prefix.concat(remaining[index]), remaining.slice(index + 1));
        }
    };

    visit([], array);
    return result;
};

const getRowCells = (row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({ r: row, c: col }));

const getColCells = (col) =>
    Array.from({ length: BOARD_SIZE }, (_, row) => ({ r: row, c: col }));

const getBoxCells = (boxRow, boxCol) => {
    const cells = [];
    const startRow = boxRow * BOX_SIZE;
    const startCol = boxCol * BOX_SIZE;

    for (let row = startRow; row < startRow + BOX_SIZE; row++) {
        for (let col = startCol; col < startCol + BOX_SIZE; col++) {
            cells.push({ r: row, c: col });
        }
    }

    return cells;
};

const getAllUnits = () => {
    const units = [];

    for (let index = 0; index < BOARD_SIZE; index++) {
        units.push(getRowCells(index));
        units.push(getColCells(index));
    }

    for (let boxRow = 0; boxRow < BOX_SIZE; boxRow++) {
        for (let boxCol = 0; boxCol < BOX_SIZE; boxCol++) {
            units.push(getBoxCells(boxRow, boxCol));
        }
    }

    return units;
};

const solveNakedForUnit = (notes, unitCells, size) => {
    const activeCells = unitCells.filter(({ r, c }) => notes[r][c].size >= 2);

    if (activeCells.length <= size) return null;

    for (const combination of getCombinations(activeCells, size)) {
        let unionMask = 0;
        for (const cell of combination) {
            unionMask |= toBitmask(notes[cell.r][cell.c]);
        }

        if (popcount(unionMask) !== size) continue;

        const nakedNumbers = toNumbers(unionMask);
        const hasEliminations = unitCells.some(unitCell =>
            !combination.some(cell => cell.r === unitCell.r && cell.c === unitCell.c) &&
            nakedNumbers.some(number => notes[unitCell.r][unitCell.c].has(number))
        );

        if (hasEliminations) {
            return { combination, unionMask };
        }
    }

    return null;
};

export const findNakedNTuples = (notes) => {
    const units = getAllUnits();

    for (let size = 2; size <= 7; size++) {
        for (const unitCells of units) {
            const foundSubset = solveNakedForUnit(notes, unitCells, size);
            if (foundSubset) return foundSubset;
        }
    }

    return null;
};

const getCandidateMask = (notes, unitCells, number, axis) => {
    let mask = 0;
    for (const cell of unitCells) {
        if (notes[cell.r][cell.c].has(number)) {
            mask |= axis === 'row' ? (1 << cell.c) : (1 << cell.r);
        }
    }
    return mask;
};

const getFishUnitCells = (axis, index) =>
    axis === 'row' ? getRowCells(index) : getColCells(index);

export const findFish = (notes) => {
    for (let size = 2; size <= 7; size++) {
        for (const axis of ['row', 'col']) {
            for (const number of DIGITS) {
                const baseLines = [];
                const candidateMasks = {};

                for (let index = 0; index < BOARD_SIZE; index++) {
                    const unitCells = getFishUnitCells(axis, index);
                    const candidateCount = unitCells.filter(({ r, c }) => notes[r][c].has(number)).length;

                    if (candidateCount >= 2 && candidateCount <= size) {
                        baseLines.push(index);
                        candidateMasks[index] = getCandidateMask(notes, unitCells, number, axis);
                    }
                }

                if (baseLines.length < size) continue;

                for (const combination of getCombinations(baseLines, size)) {
                    let unionMask = 0;
                    for (const lineIndex of combination) {
                        unionMask |= candidateMasks[lineIndex];
                    }

                    if (popcount(unionMask) !== size) continue;

                    const hasEliminations = Array.from({ length: BOARD_SIZE }, (_, index) => index)
                        .filter(index => !combination.includes(index))
                        .some(index =>
                            toNumbers(unionMask).some(maskNumber => {
                                const otherIndex = maskNumber - 1;
                                const row = axis === 'row' ? index : otherIndex;
                                const col = axis === 'row' ? otherIndex : index;
                                return notes[row][col].has(number);
                            })
                        );

                    if (!hasEliminations) continue;

                    const coverLines = toNumbers(unionMask).map(maskNumber => maskNumber - 1);
                    const highlightInfo = [];

                    if (axis === 'row') {
                        combination.forEach(row => {
                            coverLines.forEach(col => {
                                highlightInfo.push({ r: row, c: col, number });
                            });
                        });
                    } else {
                        combination.forEach(col => {
                            coverLines.forEach(row => {
                                highlightInfo.push({ r: row, c: col, number });
                            });
                        });
                    }

                    return highlightInfo;
                }
            }
        }
    }

    return null;
};
