// src/Board.js
import React, { useEffect, useRef } from 'react';
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
    highlightedHint,
    pathHighlight
}) => {
    const canvasRef = useRef(null);
    const cellSize = 40;
    const thinBorder = 1;
    const thickBorder = 2;
    const boardBorder = 2;

    const totalCellWidth = cellSize * 9;
    const totalGap = thinBorder * 8 + thickBorder * 2;
    const totalBorder = boardBorder * 2;
    const canvasBoardSize = totalCellWidth + totalGap + totalBorder;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvasBoardSize, canvasBoardSize);

        if (pathHighlight && pathHighlight.length > 0) {
            // ここで透明度を設定
            ctx.globalAlpha = 0.3; // 例として0.8に設定（0.0〜1.0）

            pathHighlight.forEach((link, index) => {
                const startCell = link.start;
                const endCell = link.end;
                const type = link.type;

                if (index % 2 === 0) {
                    ctx.strokeStyle = 'red';
                } else {
                    ctx.strokeStyle = 'blue';
                }
                ctx.lineWidth = 3;

                const startCellX = startCell.c * cellSize + Math.floor(startCell.c / 3) * thickBorder + startCell.c * thinBorder + boardBorder;
                const startCellY = startCell.r * cellSize + Math.floor(startCell.r / 3) * thickBorder + startCell.r * thinBorder + boardBorder;

                const noteSize = cellSize / 3;
                const startX = startCellX + (startCell.num % 3) * noteSize + noteSize / 2;
                const startY = startCellY + Math.floor(startCell.num / 3) * noteSize + noteSize / 2;

                const endCellX = endCell.c * cellSize + Math.floor(endCell.c / 3) * thickBorder + endCell.c * thinBorder + boardBorder;
                const endCellY = endCell.r * cellSize + Math.floor(endCell.r / 3) * thickBorder + endCell.r * thinBorder + boardBorder;
                
                const endX = endCellX + (endCell.num % 3) * noteSize + noteSize / 2;
                const endY = endCellY + Math.floor(endCell.num / 3) * noteSize + noteSize / 2;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
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
                width={canvasBoardSize}
                height={canvasBoardSize}
                className="path-overlay"
            />
        </div>
    );
};

export default Board;