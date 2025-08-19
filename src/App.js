// src/App.js
import React, { useState } from 'react';
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

    // 強調表示する数字を保持するステート
    const [highlightNumber, setHighlightNumber] = useState(null);

    const handleCellClick = (rowIndex, colIndex) => {
        // 連続入力モードがONの場合
        if (isContinuousMode) {
            // 与えられた数字のセルは操作不可
            if (initialGiven[rowIndex][colIndex]) return;

            // メモモードか、確定モードかを判断
            if (isNoteMode) {
                // メモモードの場合
                const newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));
                const cellNotes = newNotes[rowIndex][colIndex];
                if (selectedNumber) { // selectedNumberが存在するか確認
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
                }
            } else {
                // 通常モードの場合
                if (selectedNumber) { // selectedNumberが存在するか確認
                    const newBoard = board.map(r => [...r]);
                    newBoard[rowIndex][colIndex] = selectedNumber;
                    setBoard(newBoard);
                    setHighlightNumber(selectedNumber);
                    const newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));
                    newNotes[rowIndex][colIndex].clear();
                    setNotes(newNotes);
                }
            }
        } else {
            // 連続入力モードがOFFの場合、セルを選択
            if (initialGiven[rowIndex][colIndex]) {
                setSelectedCell(null);
            } else {
                setSelectedCell({ row: rowIndex, col: colIndex });
            }
        }
    };


    const handleNumberClick = (number, cell = selectedCell) => {
        // セルが選択されていない場合は処理を中断
        if (!selectedCell) {
            // 連続入力モードがONの場合、押された数字を選択済みにする
            if (isContinuousMode) {
                setSelectedNumber(number);
                setHighlightNumber(number); // ハイライトも設定
            }
            return;
        }

        // ... (以下は変更なし) ...
        const { row, col } = cell;
        if (initialGiven[row][col]) return;

        if (isNoteMode) {
            // ... (メモのロジックは変更なし) ...
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
        } else {
            // ... (確定のロジックは変更なし) ...
            const newBoard = board.map(r => [...r]);
            newBoard[row][col] = number;
            setBoard(newBoard);
            const newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));
            newNotes[row][col].clear();
            setNotes(newNotes);
        }
        setHighlightNumber(number);
    };

    const handleClearClick = () => {
        if (!selectedCell) return; // セルが選択されていない場合は処理を中断
        const { row, col } = selectedCell;
        if (initialGiven[row][col]) return;

        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = 0;
        setBoard(newBoard);

        const newNotes = notes.map(rowNotes => rowNotes.map(cellNotes => new Set(cellNotes)));
        newNotes[row][col].clear();
        setNotes(newNotes);

        setHighlightNumber(null);
    };

    const toggleNoteMode = () => {
        setIsNoteMode(!isNoteMode);
        if (isContinuousMode) {
            setSelectedNumber(null);
        }
    };

    const toggleContinuousMode = () => {
        setIsContinuousMode(!isContinuousMode);
        if (isContinuousMode) {
            setSelectedNumber(null);
        }
        if (!isContinuousMode) {
            setSelectedCell(null);
        }
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
                highlightNumber={highlightNumber} // 新しいプロパティを渡す
            />
            <div className="controls">
                <Keypad
                    onNumberClick={handleNumberClick}
                    onClearClick={handleClearClick}
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
                    className={`continuous-toggle-btn ${isContinuousMode ? 'active' : ''}`}
                    onClick={toggleContinuousMode}
                >
                    連続入力
                </button>
            </div>
        </div>
    );
};

export default App;