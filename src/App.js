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
    const [selectedCell, setSelectedCell] = useState(null); // { row: 0, col: 0 }

    const handleCellClick = (rowIndex, colIndex) => {
        // 与えられた数字のセルは選択不可
        if (!initialGiven[rowIndex][colIndex]) {
            setSelectedCell({ row: rowIndex, col: colIndex });
        } else {
            setSelectedCell(null);
        }
    };

    const handleNumberClick = (number) => {
        if (selectedCell) {
            const newBoard = board.map(row => [...row]);
            newBoard[selectedCell.row][selectedCell.col] = number;
            setBoard(newBoard);
        }
    };

    const handleClearClick = () => {
        if (selectedCell) {
            const newBoard = board.map(row => [...row]);
            newBoard[selectedCell.row][selectedCell.col] = 0;
            setBoard(newBoard);
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
            />
            <Keypad
                onNumberClick={handleNumberClick}
                onClearClick={handleClearClick}
            />
        </div>
    );
};

export default App;