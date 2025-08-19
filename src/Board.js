// src/Board.js
import React from 'react';
import Cell from './Cell';
import './Board.css';

const Board = ({ board, given, selectedCell, onCellClick, notes, highlightNumber }) => {
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
                                isHighlighted={cellValue === highlightNumber} // ハイライトの条件を追加
                                onClick={() => onCellClick(rowIndex, colIndex)}
                                notes={notes[rowIndex][colIndex]}
                                highlightNumber={highlightNumber} // notes内の強調表示にも必要
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default Board;