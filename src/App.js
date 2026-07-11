// src/App.js
import React, { useState, useRef, useEffect } from 'react';
import Board from './Board';
import Keypad from './Keypad';
import ImageToSudoku from './ImageToSudoku';
import solveAdvanced from './utils/solveAdvanced';
import { findFish, findNakedNTuples, toNumbers } from './utils/hints';
import {
    DEFAULT_BOARD,
    buildAutoNotes,
    buildMemoFromNotes,
    cloneBoard,
    cloneNotes,
    createEmptyColors,
    createEmptyNotes,
    createGivenFromBoard,
    deserializeNotes,
    eliminateNotesForPlacedNumber,
    fillSingles,
    formatGivenBoard,
    parseBoardInput,
    serializeNotes,
    validateCompletedBoard
} from './utils/sudokuBoard';
import './App.css';

// 初期ナンプレ問題
const initialBoard = DEFAULT_BOARD;
const initialGiven = createGivenFromBoard(initialBoard);

const loadState = () => {
    try {
        const serializedState = localStorage.getItem('sudoku-game-state');
        if (serializedState === null) {
            return undefined;
        }
        const state = JSON.parse(serializedState);
        return {
            board: state.board,
            notes: deserializeNotes(state.notes),
            given: state.given
        };
    } catch (error) {
        console.error("Failed to load state from localStorage:", error);
        return undefined;
    }
};

const savedState = loadState();

const App = () => {
    const [board, setBoard] = useState(savedState ? savedState.board : initialBoard);
    const [selectedCell, setSelectedCell] = useState(null);
    const [notes, setNotes] = useState(savedState ? savedState.notes : createEmptyNotes());
    const [colors, setColors] = useState(createEmptyColors());
    const [isNoteMode, setIsNoteMode] = useState(false);
    const [colorNumber, setColorNumber] = useState(0);
    const [isContinuousMode, setIsContinuousMode] = useState(false);
    const [selectedNumber, setSelectedNumber] = useState(null);
    const [highlightNumber, setHighlightNumber] = useState(null);
    const [inputBoardString, setInputBoardString] = useState(() => {
        const boardToDisplay = savedState ? savedState.board : initialBoard;
        const givenStatus = savedState ? savedState.given : initialGiven;

        return formatGivenBoard(boardToDisplay, givenStatus);
    });
    const [given, setGiven] = useState(savedState ? savedState.given : initialGiven);
    const [highlightedHint, setHighlightedHint] = useState([]);
    const [pathHighlight, setPathHighlight] = useState([]);
    
    const history = useRef([{ board: savedState ? savedState.board : initialBoard, notes: savedState ? savedState.notes : notes, given: savedState ? savedState.given : initialGiven }]);
    const historyIndex = useRef(0);

    useEffect(() => {
        const stateToSave = {
            board: board,
            notes: serializeNotes(notes),
            given: given
        };
        try {
            localStorage.setItem('sudoku-game-state', JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Failed to save state to localStorage:", error);
        }
    }, [board, notes, given]);

    const saveHistory = (newBoard, newNotes, newGiven) => {
        history.current = history.current.slice(0, historyIndex.current + 1);
        history.current.push({ board: newBoard, notes: newNotes, given: newGiven });
        historyIndex.current = history.current.length - 1;
    };

    // numberが0のときはセル全体の色を変更, 1~9のときはメモの色を変更
    const updateCellColor = (rowIndex, colIndex, number, colorNum) => {
        const newColors = colors.map(row => row.map(cellColors => [...cellColors]));
        newColors[rowIndex][colIndex][number] = colorNum;
        setColors(newColors);
    }

    const handleUndoClick = () => {
        if (historyIndex.current > 0) {
            historyIndex.current -= 1;
            const prevState = history.current[historyIndex.current];
            setBoard(prevState.board);
            setNotes(cloneNotes(prevState.notes));
            setGiven(prevState.given);
            setHighlightedHint([]);
        }
    };

    const handleRedoClick = () => {
        if (historyIndex.current < history.current.length - 1) {
            historyIndex.current += 1;
            const nextState = history.current[historyIndex.current];
            setBoard(nextState.board);
            setNotes(cloneNotes(nextState.notes));
            setGiven(nextState.given);
            setHighlightedHint([]);
        }
    };

    const handleCellClick = (rowIndex, colIndex) => {
        const clickedNumber = board[rowIndex][colIndex];
        // 既に数字が埋まっているセル
        if (clickedNumber !== 0) {
            if (colorNumber !== 0) {
                updateCellColor(rowIndex, colIndex, 0, colorNumber);
            }
            else {
                setHighlightNumber(clickedNumber);
            }
        }

        if (given[rowIndex][colIndex]) {
            setSelectedCell(null);
            return;
        }

        // 連続入力モードかつ数字が選択されている場合、その数字を入力またはメモ
        if (isContinuousMode && selectedNumber) {
            if (isNoteMode) {
                if (colorNumber !== 0) {
                    if (colors[rowIndex][colIndex][selectedNumber] === colorNumber) {
                        updateCellColor(rowIndex, colIndex, selectedNumber, 0);
                    }
                    else {
                        updateCellColor(rowIndex, colIndex, selectedNumber, colorNumber);
                    }
                    return;
                }
                const newNotes = cloneNotes(notes);
                const cellNotes = newNotes[rowIndex][colIndex];
                if (cellNotes.has(selectedNumber)) {
                    cellNotes.delete(selectedNumber);
                } else {
                    cellNotes.add(selectedNumber);
                }
                setNotes(newNotes);
                setHighlightNumber(selectedNumber);
                const newBoard = cloneBoard(board);
                newBoard[rowIndex][colIndex] = 0;
                setBoard(newBoard);
                saveHistory(newBoard, newNotes, given);
            } else {
                const newBoard = cloneBoard(board);
                if (clickedNumber === selectedNumber) {
                    newBoard[rowIndex][colIndex] = 0;    
                }
                else {
                    newBoard[rowIndex][colIndex] = selectedNumber;
                }
                setBoard(newBoard);
                setHighlightNumber(selectedNumber);
                const newNotes = cloneNotes(notes);
                newNotes[rowIndex][colIndex].clear();
                const updatedNotes = eliminateNotesForPlacedNumber(newNotes, rowIndex, colIndex, selectedNumber);
                setNotes(updatedNotes);
                saveHistory(newBoard, updatedNotes, given);
                setHighlightedHint([]);
            }
        } else {
            if (!isNoteMode) {
                if (colors[rowIndex][colIndex][0] === colorNumber) {
                    updateCellColor(rowIndex, colIndex, 0, 0);
                }
                else {
                    updateCellColor(rowIndex, colIndex, 0, colorNumber);
                }
            }
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

        if (isNoteMode) {
            if (colorNumber !== 0) {
                if (colors[row][col][number] === colorNumber) {
                    updateCellColor(row, col, number, 0);
                }
                else {
                    updateCellColor(row, col, number, colorNumber);
                }
                return;
            }
            const newNotes = cloneNotes(notes);
            const cellNotes = newNotes[row][col];
            if (cellNotes.has(number)) {
                cellNotes.delete(number);
            } else {
                cellNotes.add(number);
            }
            setNotes(newNotes);
            const newBoard = cloneBoard(board);
            newBoard[row][col] = 0;
            setBoard(newBoard);
            saveHistory(newBoard, newNotes, given);
        } else {
            const newBoard = cloneBoard(board);
            newBoard[row][col] = number;
            setBoard(newBoard);
            const newNotes = cloneNotes(notes);
            newNotes[row][col].clear();
            const updatedNotes = eliminateNotesForPlacedNumber(newNotes, row, col, number);
            setNotes(updatedNotes);
            saveHistory(newBoard, updatedNotes, given);
        }
        setHighlightNumber(number);
    };

    const handleClearClick = () => {
        if (!selectedCell) return;
        const { row, col } = selectedCell;
        if (given[row][col]) return;

        const newBoard = cloneBoard(board);
        newBoard[row][col] = 0;
        setBoard(newBoard);
        const newNotes = cloneNotes(notes);
        newNotes[row][col].clear();
        setNotes(newNotes);
        setHighlightNumber(null);
        saveHistory(newBoard, newNotes, given);
        setHighlightedHint([]);
    };

    const toggleNoteMode = () => {
        setIsNoteMode(!isNoteMode);
    };

    const handleLongPressToggle = (number) => {
        if (isContinuousMode && selectedNumber === number) {
            setHighlightNumber(null);
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
        setHighlightedHint([]);
        const newNotes = buildAutoNotes(board);
        setNotes(newNotes);
        saveHistory(board, newNotes, given);
    };

    const handleBoardInputChange = (e) => {
        setInputBoardString(e.target.value);
    };

    const handleClearBoardInput = () => {
        setInputBoardString('');
    };

    const handleSetBoard = () => {
        const parsedBoard = parseBoardInput(inputBoardString);
        if (parsedBoard.error) {
            alert(parsedBoard.error);
            return;
        }

        const { board: newBoard, given: newGiven } = parsedBoard;
        setBoard(newBoard);
        setGiven(newGiven);
        setSelectedCell(null);
        setHighlightNumber(null);
        setHighlightedHint([]);
        setColors(createEmptyColors());
        const newNotes = createEmptyNotes();
        setNotes(newNotes);
        history.current = [{ board: newBoard, notes: newNotes, given: newGiven }];
        historyIndex.current = 0;
    };

    const handleFillSingle = () => {
        setHighlightedHint([]);
        const { board: newBoard, notes: newNotes, changed } = fillSingles(board, notes);

        if (changed) {
            setBoard(newBoard);
            setNotes(newNotes);
            saveHistory(newBoard, newNotes, given);
        }
    };

    const checkBoard = () => {
        const result = validateCompletedBoard(board);
        alert(result.message);
    };

    const handleFindNakedSubsets = () => {
        setHighlightedHint([]);
        setPathHighlight([]);
        const found = findNakedNTuples(notes);
        if (found) {
            const nakedNumbers = toNumbers(found.unionMask);
            const highlightInfo = found.combination.flatMap(cell => 
                nakedNumbers.map(number => ({ ...cell, number }))
            );
            setHighlightedHint(highlightInfo);
        } else {
            alert("N国同盟は見つかりませんでした。");
        }
    };

    const handleFindFish = () => {
        setHighlightedHint([]);
        setPathHighlight([]);
        const foundFish = findFish(notes);
        if (foundFish) {
            setHighlightedHint(foundFish);
        }
        else {
            alert("N-fishは見つかりませんでした。");
        }
    };

    const handleColorClick = () => {
        setPathHighlight([]);
        setColorNumber((colorNumber + 1) % 5);
    };

    const handleColorClearClick = () => {
        setPathHighlight([]);
        setHighlightedHint([]);
        setColors(createEmptyColors());
        setColorNumber(0);
    };

    const handleFindChain = () => {
        setHighlightedHint([]);
        const memo = buildMemoFromNotes(notes);
        const path = solveAdvanced(memo);
        if (!path || path.length === 0) {
            alert("Chainは見つかりませんでした。");
            return;
        }
        setPathHighlight(path);
        const highlightInfo = path.map(({ start, end }) => [
            { r: start.r, c: start.c, number: start.num + 1 },
            { r: end.r, c: end.c, number: end.num + 1 }
        ]).flat();
        setHighlightedHint(highlightInfo);
    };

    return (
        <div className="app">
            <Board
                board={board}
                given={given}
                selectedCell={selectedCell}
                onCellClick={handleCellClick}
                notes={notes}
                colors={colors}
                highlightNumber={highlightNumber}
                highlightedHint={highlightedHint}
                pathHighlight={pathHighlight}
            />
            <div className="controls">
                <Keypad
                    onNumberClick={handleNumberClick}
                    onClearClick={handleClearClick}
                    onLongPressToggle={handleLongPressToggle}
                    isNoteMode={isNoteMode}
                    colorNumber={colorNumber}
                    selectedNumber={selectedNumber}
                    toggleNoteMode={toggleNoteMode}
                    handleUndoClick={handleUndoClick}
                    handleRedoClick={handleRedoClick}
                    handleColorClick={handleColorClick}
                    handleColorClearClick={handleColorClearClick}
                    historyIndex={historyIndex.current}
                    historyLength={history.current.length}
                />
                <div className="support-features">
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
                        className="check-btn"
                        onClick={checkBoard}
                    >
                        正誤判定
                    </button>
                </div>
                <div className="hint-features">
                    <button
                        className="naked-subset-btn"
                        onClick={handleFindNakedSubsets}
                    >
                        N国同盟
                    </button>
                    <button
                        className="n-fish-btn"
                        onClick={handleFindFish}
                    >
                        N-fish
                    </button>
                    <button
                        className="chain-btn"
                        onClick={handleFindChain}
                    >
                        Chain
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
            <ImageToSudoku onConvert={setInputBoardString} />
        </div>
    );
};

export default App;
