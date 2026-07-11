// src/Board.js
import React, { useEffect, useRef } from 'react';
import Cell from './Cell';
import './Board.css';

const CELL_SIZE = 40;
const THIN_BORDER = 1;
const THICK_BORDER = 2;
const BOARD_BORDER = 2;
const CANVAS_BOARD_SIZE = CELL_SIZE * 9 + THIN_BORDER * 8 + THICK_BORDER * 2 + BOARD_BORDER * 2;

const getCellOrigin = (cell) => ({
    x: cell.c * CELL_SIZE + Math.floor(cell.c / 3) * THICK_BORDER + cell.c * THIN_BORDER + BOARD_BORDER,
    y: cell.r * CELL_SIZE + Math.floor(cell.r / 3) * THICK_BORDER + cell.r * THIN_BORDER + BOARD_BORDER
});

const getNoteCenter = (cell) => {
    const origin = getCellOrigin(cell);
    const noteSize = CELL_SIZE / 3;

    return {
        x: origin.x + (cell.num % 3) * noteSize + noteSize / 2,
        y: origin.y + Math.floor(cell.num / 3) * noteSize + noteSize / 2
    };
};

const Board = ({
    board,
    given,
    selectedCell,
    onCellClick,
    notes,
    colors,
    highlightNumber,
    highlightedHint,
    pathHighlight
}) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, CANVAS_BOARD_SIZE, CANVAS_BOARD_SIZE);

        if (pathHighlight && pathHighlight.length > 0) {
            // ここで透明度を設定
            ctx.globalAlpha = 0.3; // 例として0.8に設定（0.0〜1.0）

            pathHighlight.forEach((link, index) => {
                const startCell = link.start;
                const endCell = link.end;

                if (index % 2 === 0) {
                    ctx.strokeStyle = 'red';
                } else {
                    ctx.strokeStyle = 'blue';
                }
                ctx.lineWidth = 3;

                const start = getNoteCenter(startCell);
                const end = getNoteCenter(endCell);
                
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            });

            // 描画後、元の不透明度に戻す（念のため）
            ctx.globalAlpha = 1.0;
        }
    }, [pathHighlight]);

    return (
        <div className="board-container">
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
            <canvas
                ref={canvasRef}
                width={CANVAS_BOARD_SIZE}
                height={CANVAS_BOARD_SIZE}
                className="path-overlay"
            />
        </div>
    );
};

export default Board;
