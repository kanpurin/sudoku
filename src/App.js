// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import Board from './Board';
import Keypad from './Keypad';
import './App.css';

// 初期ナンプレ問題
const initialBoard = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
];

// 初期ボードの「与えられた数字」の状態を保持
const initialGiven = initialBoard.map(row => row.map(cell => cell !== 0));

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

    // 状態の履歴を管理
    const history = useRef([{ board: initialBoard, notes: notes }]);
    const historyIndex = useRef(0);

    const saveHistory = (newBoard, newNotes) => {
        // 現在の履歴以降を削除
        history.current = history.current.slice(0, historyIndex.current + 1);
        // 新しい状態を追加
        history.current.push({ board: newBoard, notes: newNotes });
        // 履歴インデックスを更新
        historyIndex.current = history.current.length - 1;
    };

    const handleUndoClick = () => {
        if (historyIndex.current > 0) {
            // インデックスを1つ戻す
            historyIndex.current -= 1;
            const prevState = history.current[historyIndex.current];
            setBoard(prevState.board);
            setNotes(prevState.notes.map(row => row.map(cellNotes => new Set(cellNotes))));
        }
    };

    // デバッグ情報を出力するuseEffectフック
    useEffect(() => {
        console.log('--- App State ---');
        console.log('selectedCell:', selectedCell);
        console.log('isNoteMode:', isNoteMode);
        console.log('isContinuousMode:', isContinuousMode);
        console.log('selectedNumber:', selectedNumber);
        console.log('highlightNumber:', highlightNumber);
        console.log('notes:', notes.map(row => row.map(cellNotes => Array.from(cellNotes))));
        console.log('-----------------');
    }, [selectedCell, isNoteMode, isContinuousMode, selectedNumber, highlightNumber, notes]);

    // 新しく追加するヘルパー関数
    const updateNotesAfterInput = (rowIndex, colIndex, number, newNotes) => {
        // 行のメモを更新
        for (let c = 0; c < 9; c++) {
            if (c !== colIndex) {
                newNotes[rowIndex][c].delete(number);
            }
        }
        // 列のメモを更新
        for (let r = 0; r < 9; r++) {
            if (r !== rowIndex) {
                newNotes[r][colIndex].delete(number);
            }
        }
        // ブロックのメモを更新
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

        if (initialGiven[rowIndex][colIndex]) {
            setSelectedCell(null);
            return;
        }
        
        // 連続入力モードがONの場合
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
                    
                    // 状態を履歴に保存
                    saveHistory(newBoard, newNotes);
                }
            } else {
                if (selectedNumber) {
                    const newBoard = board.map(r => [...r]);
                    newBoard[rowIndex][colIndex] = selectedNumber;
                    
                    const newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));
                    newNotes[rowIndex][colIndex].clear();
                    const updatedNotes = updateNotesAfterInput(rowIndex, colIndex, selectedNumber, newNotes);
                    
                    setBoard(newBoard);
                    setNotes(updatedNotes);
                    setHighlightNumber(selectedNumber);
                    
                    // 状態を履歴に保存
                    saveHistory(newBoard, updatedNotes);
                }
            }
        } else {
            setSelectedCell({ row: rowIndex, col: colIndex });
        }
    };

    const handleNumberClick = (number, cell = selectedCell) => {
        if (isContinuousMode) {
            if (selectedNumber !== number) {
                // 別の数字を押した場合は、その数字を新しく選択
                setSelectedNumber(number);
                setHighlightNumber(number);
                setIsContinuousMode(false);
            }
            return;
        }
        
        if (!selectedCell) {
            return;
        }

        const { row, col } = cell;
        if (initialGiven[row][col]) return;

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

            saveHistory(newBoard, newNotes);
        } else {
            const newBoard = board.map(r => [...r]);
            newBoard[row][col] = number;
            
            const newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));
            newNotes[row][col].clear();
            const updatedNotes = updateNotesAfterInput(row, col, number, newNotes);
            
            setBoard(newBoard);
            setNotes(updatedNotes);
            setHighlightNumber(number);
            
            // 状態を履歴に保存
            saveHistory(newBoard, updatedNotes);
        }
        setHighlightNumber(number);
    };

    const handleClearClick = () => {
        if (!selectedCell) return;
        const { row, col } = selectedCell;
        if (initialGiven[row][col]) return;

        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = 0;
        setBoard(newBoard);

        const newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));
        newNotes[row][col].clear();
        setNotes(newNotes);

        setHighlightNumber(null);

        // 状態を履歴に保存
        saveHistory(newBoard, newNotes);
    };

    const toggleNoteMode = () => {
        setIsNoteMode(!isNoteMode);
        if (isContinuousMode) {
            setSelectedNumber(null);
        }
    };
    
    const handleLongPressToggle = (number) => {
        if (isContinuousMode && selectedNumber === number) {
            // 同じ数字を長押しでモード解除
            setIsContinuousMode(false);
            setSelectedNumber(null);
            setHighlightNumber(null);
        } else {
            // 新しい数字を長押しでモードON
            setIsContinuousMode(true);
            setSelectedNumber(number);
            setHighlightNumber(number);
            setSelectedCell(null);
        }
    };

    // 自動メモ機能のハンドラ
    const handleAutoNoteClick = () => {
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
        saveHistory(board, newNotes);
    };

    return (
        <div className="app">
            <h1>ナンプレ</h1>
            <Board
                board={board}
                given={initialGiven}
                selectedCell={selectedCell}
                onCellClick={handleCellClick}
                notes={notes}
                highlightNumber={highlightNumber}
            />
            <div className="controls">
                <Keypad
                    onNumberClick={handleNumberClick}
                    onClearClick={handleClearClick}
                    onLongPressToggle={handleLongPressToggle}
                    isNoteMode={isNoteMode}
                    isContinuousMode={isContinuousMode}
                    selectedNumber={selectedNumber}
                />
                <button
                    className={`note-toggle-btn ${isNoteMode ? 'active' : ''}`}
                    onClick={toggleNoteMode}
                >
                    メモ
                </button>
                <button
                    className="auto-note-btn"
                    onClick={handleAutoNoteClick}
                >
                    自動メモ
                </button>
                <button
                    className="undo-btn"
                    onClick={handleUndoClick}
                    disabled={historyIndex.current === 0}
                >
                    戻る
                </button>
            </div>
        </div>
    );
};

export default App;