// src/Cell.js
import React from 'react';
import './Cell.css';

const Cell = ({ value, given, onClick, isSelected, isHighlighted, notes, highlightNumber }) => {
    return (
        <div
            className={`cell ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : (given ? 'given' : '')}`}
        >
            <div className="cell-content">
                {value !== 0 ? (
                    <span className="main-number">{value}</span>
                ) : (
                    <div className="notes-container">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <div key={num} className={`note-cell ${notes.has(num) && num === highlightNumber ? 'highlighted-note' : ''}`}>
                                {notes.has(num) && (
                                    <span className="note-number">{num}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 中央だけクリック可能な透明の当たり判定 */}
            <div className="click-area" onClick={onClick}></div>
        </div>
    );
};


export default Cell;