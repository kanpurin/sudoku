// src/Board.js
import React from 'react';
import Cell from './Cell';
import './Board.css';

const Board = ({ 
    board, 
    given, 
    selectedCell, 
    onCellClick, 
    notes, 
    colors,
    highlightNumber, 
    highlightedHint
}) => {
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
                                isHighlighted={cellValue === highlightNumber}
                                onClick={() => onCellClick(rowIndex, colIndex)}
                                notes={notes[rowIndex][colIndex]}
                                colors={colors[rowIndex][colIndex]}
                                highlightNumber={highlightNumber}
                                highlightedHintNumbers={highlightedHint.filter(c => c.r === rowIndex && c.c === colIndex).map(c => c.number)}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default Board;