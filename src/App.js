// src/App.js
import React, { useState, useRef } from 'react';
import Board from './Board';
import Keypad from './Keypad';
import './App.css';

// 初期ナンプレ問題
const initialBoard = [
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

// 初期ボードの「与えられた数字」の状態を保持
const initialGiven = initialBoard.map(row => row.map(cell => cell !== 0));

// ヘルパー関数: Setをビットマスクに変換
const toBitmask = (notesSet) => {
    let mask = 0;
    notesSet.forEach(num => {
        mask |= (1 << (num - 1));
    });
    return mask;
};

// ヘルパー関数: ビットマスクから数字のリストを生成
const toNumbers = (mask) => {
    const numbers = [];
    for (let i = 0; i < 9; i++) {
        if ((mask >> i) & 1) {
            numbers.push(i + 1);
        }
    }
    return numbers;
};

// ヘルパー関数: ポップカウント (ビットマスクの1の数を数える)
const popcount = (mask) => {
    let count = 0;
    while (mask !== 0) {
        mask &= (mask - 1);
        count++;
    }
    return count;
};

const App = () => {
    const [board, setBoard] = useState(initialBoard);
    const [selectedCell, setSelectedCell] = useState(null);
    const [notes, setNotes] = useState(
        Array(9).fill(null).map(() => Array(9).fill(new Set()))
    );
    const [isNoteMode, setIsNoteMode] = useState(false);
    const [isContinuousMode, setIsContinuousMode] = useState(false);
    const [selectedNumber, setSelectedNumber] = useState(null);
    const [highlightNumber, setHighlightNumber] = useState(null);

    const [inputBoardString, setInputBoardString] = useState(
        initialBoard.map(row => row.join('')).join('\n')
    );
    const [given, setGiven] = useState(initialGiven);
    const [highlightedNakedSubset, setHighlightedNakedSubset] = useState([]);
    
    const history = useRef([{ board: initialBoard, notes: notes, given: initialGiven }]);
    const historyIndex = useRef(0);

    const saveHistory = (newBoard, newNotes, newGiven) => {
        history.current = history.current.slice(0, historyIndex.current + 1);
        history.current.push({ board: newBoard, notes: newNotes, given: newGiven });
        historyIndex.current = history.current.length - 1;
    };

    const handleUndoClick = () => {
        if (historyIndex.current > 0) {
            historyIndex.current -= 1;
            const prevState = history.current[historyIndex.current];
            setBoard(prevState.board);
            setNotes(prevState.notes.map(row => row.map(cellNotes => new Set(cellNotes))));
            setGiven(prevState.given);
            setHighlightedNakedSubset([]);
        }
    };

    const handleRedoClick = () => {
        if (historyIndex.current < history.current.length - 1) {
            historyIndex.current += 1;
            const nextState = history.current[historyIndex.current];
            setBoard(nextState.board);
            setNotes(nextState.notes.map(row => row.map(cellNotes => new Set(cellNotes))));
            setGiven(nextState.given);
            setHighlightedNakedSubset([]);
        }
    };

    const updateNotesAfterInput = (rowIndex, colIndex, number, newNotes) => {
        for (let c = 0; c < 9; c++) {
            if (c !== colIndex) {
                newNotes[rowIndex][c].delete(number);
            }
        }
        for (let r = 0; r < 9; r++) {
            if (r !== rowIndex) {
                newNotes[r][colIndex].delete(number);
            }
        }
        const startRow = Math.floor(rowIndex / 3) * 3;
        const startCol = Math.floor(colIndex / 3) * 3;
        for (let r = startRow; r < startRow + 3; r++) {
            for (let c = startCol; c < startCol + 3; c++) {
                if (r !== rowIndex || c !== colIndex) {
                    newNotes[r][c].delete(number);
                }
            }
        }
        return newNotes;
    };

    const handleCellClick = (rowIndex, colIndex) => {
        const clickedNumber = board[rowIndex][colIndex];
        if (clickedNumber !== 0) {
            setHighlightNumber(clickedNumber);
        } else {
            setHighlightNumber(null);
        }

        if (given[rowIndex][colIndex]) {
            setSelectedCell(null);
            return;
        }

        if (isContinuousMode && selectedNumber) {
            if (isNoteMode) {
                const newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));
                const cellNotes = newNotes[rowIndex][colIndex];
                if (selectedNumber) {
                    if (cellNotes.has(selectedNumber)) {
                        cellNotes.delete(selectedNumber);
                    } else {
                        cellNotes.add(selectedNumber);
                    }
                    setNotes(newNotes);
                    setHighlightNumber(selectedNumber);
                    const newBoard = board.map(r => [...r]);
                    newBoard[rowIndex][colIndex] = 0;
                    setBoard(newBoard);
                    saveHistory(newBoard, newNotes, given);
                }
            } else {
                if (selectedNumber) {
                    const newBoard = board.map(r => [...r]);
                    newBoard[rowIndex][colIndex] = selectedNumber;
                    setBoard(newBoard);
                    setHighlightNumber(selectedNumber);
                    const newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));
                    newNotes[rowIndex][colIndex].clear();
                    const updatedNotes = updateNotesAfterInput(rowIndex, colIndex, selectedNumber, newNotes);
                    setNotes(updatedNotes);
                    saveHistory(newBoard, updatedNotes, given);
                    setHighlightedNakedSubset([]);
                }
            }
        } else {
            setSelectedCell({ row: rowIndex, col: colIndex });
        }
    };

    const handleNumberClick = (number, cell = selectedCell) => {
        if (isContinuousMode) {
            if (selectedNumber !== number) {
                setSelectedNumber(number);
                setHighlightNumber(number);
                setIsContinuousMode(true);
                setSelectedCell(null);
            }
            return;
        }

        if (!selectedCell) {
            setHighlightNumber(number);
            return;
        }

        const { row, col } = cell;
        if (given[row][col]) return;

        setHighlightedNakedSubset([]); // 強調表示をリセット

        if (isNoteMode) {
            const newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));
            const cellNotes = newNotes[row][col];
            if (cellNotes.has(number)) {
                cellNotes.delete(number);
            } else {
                cellNotes.add(number);
            }
            setNotes(newNotes);
            const newBoard = board.map(r => [...r]);
            newBoard[row][col] = 0;
            setBoard(newBoard);
            saveHistory(newBoard, newNotes, given);
        } else {
            const newBoard = board.map(r => [...r]);
            newBoard[row][col] = number;
            setBoard(newBoard);
            const newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));
            newNotes[row][col].clear();
            const updatedNotes = updateNotesAfterInput(row, col, number, newNotes);
            setNotes(updatedNotes);
            saveHistory(newBoard, updatedNotes, given);
        }
        setHighlightNumber(number);
    };

    const handleClearClick = () => {
        if (!selectedCell) return;
        const { row, col } = selectedCell;
        if (given[row][col]) return;

        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = 0;
        setBoard(newBoard);
        const newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));
        newNotes[row][col].clear();
        setNotes(newNotes);
        setHighlightNumber(null);
        saveHistory(newBoard, newNotes, given);
        setHighlightedNakedSubset([]);
    };

    const toggleNoteMode = () => {
        setIsNoteMode(!isNoteMode);
    };

    const handleLongPressToggle = (number) => {
        if (isContinuousMode && selectedNumber === number) {
            setIsContinuousMode(false);
            setSelectedNumber(null);
        } else {
            setIsContinuousMode(true);
            setSelectedNumber(number);
            setHighlightNumber(number);
            setSelectedCell(null);
        }
    };

    const handleAutoNoteClick = () => {
        setHighlightedNakedSubset([]);
        const newNotes = Array(9).fill(null).map(() => Array(9).fill(new Set()));
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    const possibleNumbers = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    for (let c = 0; c < 9; c++) {
                        if (board[row][c] !== 0) {
                            possibleNumbers.delete(board[row][c]);
                        }
                    }
                    for (let r = 0; r < 9; r++) {
                        if (board[r][col] !== 0) {
                            possibleNumbers.delete(board[r][col]);
                        }
                    }
                    const startRow = Math.floor(row / 3) * 3;
                    const startCol = Math.floor(col / 3) * 3;
                    for (let r = startRow; r < startRow + 3; r++) {
                        for (let c = startCol; c < startCol + 3; c++) {
                            if (board[r][c] !== 0) {
                                possibleNumbers.delete(board[r][c]);
                            }
                        }
                    }
                    newNotes[row][col] = possibleNumbers;
                }
            }
        }
        setNotes(newNotes);
        // 自動メモ時も履歴を保存
        saveHistory(board, newNotes, given);
    };

    const handleBoardInputChange = (e) => {
        setInputBoardString(e.target.value);
    };

    const handleClearBoardInput = () => {
        setInputBoardString('');
    };

    const handleSetBoard = () => {
        // 入力文字列から改行やスペースを削除
        const cleanedString = inputBoardString.replace(/\s/g, '');

        if (cleanedString.length !== 81) {
            alert(`入力は81文字の数字でなければなりません。現在の文字数: ${cleanedString.length}`);
            return;
        }
        
        const newBoard = [];
        const newGiven = [];
        let index = 0;
        for (let i = 0; i < 9; i++) {
            const row = [];
            const givenRow = [];
            for (let j = 0; j < 9; j++) {
                const char = cleanedString[index];
                const num = parseInt(char, 10);
                if (isNaN(num) || num < 0 || num > 9) {
                    alert("入力が無効です。0-9の数字のみを使用してください。");
                    return;
                }
                row.push(num);
                givenRow.push(num !== 0);
                index++;
            }
            newBoard.push(row);
            newGiven.push(givenRow);
        }
        setBoard(newBoard);
        setGiven(newGiven);
        setSelectedCell(null);
        setHighlightNumber(null);
        setHighlightedNakedSubset([]);
        const newNotes = Array(9).fill(null).map(() => Array(9).fill(new Set()));
        setNotes(newNotes);
        history.current = [{ board: newBoard, notes: newNotes, given: newGiven }];
        historyIndex.current = 0;
    };

    const handleFillSingle = () => {
        setHighlightedNakedSubset([]);
        let cellsUpdatedInLoop = false;
        let newBoard = board.map(row => [...row]);
        let newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));

        do {
            cellsUpdatedInLoop = false;
            
            // 1. 裸のシングル (Naked Single) を探して埋める
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (newBoard[r][c] === 0 && newNotes[r][c].size === 1) {
                        const numberToFill = Array.from(newNotes[r][c])[0];
                        newBoard[r][c] = numberToFill;
                        newNotes[r][c].clear();
                        newNotes = updateNotesAfterInput(r, c, numberToFill, newNotes);
                        cellsUpdatedInLoop = true;
                    }
                }
            }

            // 2. 隠れたシングル (Hidden Single) を探して埋める
            for (let num = 1; num <= 9; num++) {
                // 行をチェック
                for (let r = 0; r < 9; r++) {
                    const foundCells = [];
                    for (let c = 0; c < 9; c++) {
                        if (newBoard[r][c] === 0 && newNotes[r][c].has(num)) {
                            foundCells.push({ row: r, col: c });
                        }
                    }
                    if (foundCells.length === 1) {
                        const { row, col } = foundCells[0];
                        newBoard[row][col] = num;
                        newNotes[row][col].clear();
                        newNotes = updateNotesAfterInput(row, col, num, newNotes);
                        cellsUpdatedInLoop = true;
                    }
                }

                // 列をチェック
                for (let c = 0; c < 9; c++) {
                    const foundCells = [];
                    for (let r = 0; r < 9; r++) {
                        if (newBoard[r][c] === 0 && newNotes[r][c].has(num)) {
                            foundCells.push({ row: r, col: c });
                        }
                    }
                    if (foundCells.length === 1) {
                        const { row, col } = foundCells[0];
                        newBoard[row][col] = num;
                        newNotes[row][col].clear();
                        newNotes = updateNotesAfterInput(row, col, num, newNotes);
                        cellsUpdatedInLoop = true;
                    }
                }

                // ブロックをチェック
                for (let br = 0; br < 3; br++) {
                    for (let bc = 0; bc < 3; bc++) {
                        const foundCells = [];
                        const startRow = br * 3;
                        const startCol = bc * 3;
                        for (let r = startRow; r < startRow + 3; r++) {
                            for (let c = startCol; c < startCol + 3; c++) {
                                if (newBoard[r][c] === 0 && newNotes[r][c].has(num)) {
                                    foundCells.push({ row: r, col: c });
                                }
                            }
                        }
                        if (foundCells.length === 1) {
                            const { row, col } = foundCells[0];
                            newBoard[row][col] = num;
                            newNotes[row][col].clear();
                            newNotes = updateNotesAfterInput(row, col, num, newNotes);
                            cellsUpdatedInLoop = true;
                        }
                    }
                }
            }
        } while (cellsUpdatedInLoop);

        // 変更があった場合のみ状態を更新して履歴を保存
        if (JSON.stringify(newBoard) !== JSON.stringify(board)) {
            setBoard(newBoard);
            setNotes(newNotes);
            saveHistory(newBoard, newNotes, given);
            setIsContinuousMode(false);
            setSelectedNumber(null);
            setHighlightNumber(null);
        }
    };

    const checkBoard = () => {
        // ボードのコピーを作成
        const currentBoard = board.map(row => [...row]);

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const value = currentBoard[r][c];
                if (value === 0) {
                    // 空セルがある場合はエラー
                    alert("エラー: 行 " + (r + 1) + ", 列 " + (c + 1) + " が空です。");
                    return;
                }

                // 一時的にそのセルを0にして、重複をチェック
                currentBoard[r][c] = 0;

                // 行の重複をチェック
                for (let i = 0; i < 9; i++) {
                    if (currentBoard[r][i] === value) {
                        alert(`エラー: 行 ${r + 1} に数字 ${value} が重複しています。`);
                        return;
                    }
                }

                // 列の重複をチェック
                for (let i = 0; i < 9; i++) {
                    if (currentBoard[i][c] === value) {
                        alert(`エラー: 列 ${c + 1} に数字 ${value} が重複しています。`);
                        return;
                    }
                }

                // ブロックの重複をチェック
                const startRow = Math.floor(r / 3) * 3;
                const startCol = Math.floor(c / 3) * 3;
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        if (currentBoard[startRow + i][startCol + j] === value) {
                            alert(`エラー: ブロック (${startRow / 3 + 1}, ${startCol / 3 + 1}) に数字 ${value} が重複しています。`);
                            return;
                        }
                    }
                }
                
                // チェック後、元の値に戻す
                currentBoard[r][c] = value;
            }
        }
        alert("正解！");
    };

    const handleFindNakedSubsets = () => {
        setHighlightedNakedSubset([]);
        const found = solveNakedNTuples();
        if (found) {
            setHighlightedNakedSubset(found);
        } else {
            alert("N国同盟は見つかりませんでした。");
        }
    };

    const solveNakedNTuples = () => {
        let foundSubset = null;

        // Nが小さい順に探索 (N = 2, 3, 4, 5...)
        for (let n = 2; n <= 7; n++) {
            // 行のチェック
            for (let i = 0; i < 9; i++) {
                const rowCells = Array.from({ length: 9 }, (_, j) => ({ r: i, c: j }));
                foundSubset = solveNakedForUnit(rowCells, n);
                if (foundSubset) return foundSubset;
            }

            // 列のチェック
            for (let i = 0; i < 9; i++) {
                const colCells = Array.from({ length: 9 }, (_, j) => ({ r: j, c: i }));
                foundSubset = solveNakedForUnit(colCells, n);
                if (foundSubset) return foundSubset;
            }

            // ブロックのチェック
            for (let rBlock = 0; rBlock < 3; rBlock++) {
                for (let cBlock = 0; cBlock < 3; cBlock++) {
                    const blockCells = [];
                    for (let r = rBlock * 3; r < rBlock * 3 + 3; r++) {
                        for (let c = cBlock * 3; c < cBlock * 3 + 3; c++) {
                            blockCells.push({ r, c });
                        }
                    }
                    foundSubset = solveNakedForUnit(blockCells, n);
                    if (foundSubset) return foundSubset;
                }
            }
        }

        return null;
    };

    const solveNakedForUnit = (unitCells, n) => {
        // 候補が2つ以上あるセルをフィルタリング
        const activeCells = unitCells.filter(({ r, c }) => notes[r][c].size >= 2);
        
        if (activeCells.length <= n) return null;

        const combinations = getCombinations(activeCells, n);
        
        for (const combination of combinations) {
            let unionMask = 0;
            for (const cell of combination) {
                unionMask |= toBitmask(notes[cell.r][cell.c]);
            }
            
            // 1. 和集合のサイズがnと一致するか
            if (popcount(unionMask) === n) {
                // 2. N国同盟の数字が他のセルに存在しないかチェック
                const nakedNumbers = toNumbers(unionMask);
                let numbersFoundInOtherCells = false;
                
                // 結合内のセル以外のすべてのセルを探索
                for (const unitCell of unitCells) {
                    // 結合に含まれていないセルか確認
                    if (!combination.some(c => c.r === unitCell.r && c.c === unitCell.c)) {
                        // 他のセルにN国同盟の数字が含まれているか
                        for (const num of nakedNumbers) {
                            if (notes[unitCell.r][unitCell.c].has(num)) {
                                numbersFoundInOtherCells = true;
                                break;
                            }
                        }
                    }
                    if (numbersFoundInOtherCells) break;
                }
                
                // 他のセルにも候補として存在する場合のみN国同盟と見なす
                if (numbersFoundInOtherCells) {
                    return combination;
                }
            }
        }
        return null;
    };

    const getCombinations = (array, size) => {
        const result = [];
        const f = (prefix, remaining) => {
            if (prefix.length === size) {
                result.push(prefix);
                return;
            }
            if (remaining.length === 0) return;
            
            for (let i = 0; i < remaining.length; i++) {
                f(prefix.concat(remaining[i]), remaining.slice(i + 1));
            }
        };
        f([], array);
        return result;
    };

    return (
        <div className="app">
            <Board
                board={board}
                given={given}
                selectedCell={selectedCell}
                onCellClick={handleCellClick}
                notes={notes}
                highlightNumber={highlightNumber}
                highlightedNakedSubset={highlightedNakedSubset}
            />
            <div className="controls">
                <Keypad
                    onNumberClick={handleNumberClick}
                    onClearClick={handleClearClick}
                    onLongPressToggle={handleLongPressToggle}
                    isNoteMode={isNoteMode}
                    selectedNumber={selectedNumber}
                    toggleNoteMode={toggleNoteMode}
                    handleUndoClick={handleUndoClick}
                    handleRedoClick={handleRedoClick}
                    historyIndex={historyIndex.current}
                    historyLength={history.current.length}
                />
                <div className="button-group">
                    <button
                        className="auto-note-btn"
                        onClick={handleAutoNoteClick}
                    >
                        自動メモ
                    </button>
                    <button
                        className="fill-single-btn"
                        onClick={handleFillSingle}
                    >
                        一択埋め
                    </button>
                    <button
                        className="naked-subset-btn"
                        onClick={handleFindNakedSubsets}
                    >
                        N国同盟
                    </button>
                    <button
                        className="check-btn"
                        onClick={checkBoard}
                    >
                        正誤判定
                    </button>
                </div>
            </div>
            <div className="input-section">
                <textarea
                    value={inputBoardString}
                    onChange={handleBoardInputChange}
                    rows="9"
                    cols="9"
                    placeholder="9x9の数字を81文字で入力してください（空セルは0）"
                />
                <div className="input-buttons">
                    <button onClick={handleSetBoard}>設定</button>
                    <button onClick={handleClearBoardInput}>削除</button>
                </div>
            </div>
        </div>
    );
};

export default App;