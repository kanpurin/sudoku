// src/Board.js
import React from 'react';
import Cell from './Cell';
import './Board.css';

const Board = ({ board, given, selectedCell, onCellClick }) => {
    return (
        <div className="board">
            {board.map((row, rowIndex) => (
                <div key={rowIndex} className="row">
                    {row.map((cellValue, colIndex) => {
                        const isSelected = selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex;
                        return (
                            <Cell
                                key={`${rowIndex}-${colIndex}`}
                                value={cellValue}
                                given={given[rowIndex][colIndex]}
                                isSelected={isSelected}
                                onClick={() => onCellClick(rowIndex, colIndex)}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default Board;