import React from 'react';
import './Cell.css';

const Cell = ({ 
    value, 
    given, 
    onClick, 
    isSelected, 
    isHighlighted, 
    notes,
    colors,
    highlightNumber,
    highlightedHintNumbers
}) => {
    return (
        <div
            className={`cell ${colors[0] !== 0 ? `color${colors[0]}` : (isSelected ? 'selected' : (isHighlighted ? 'highlighted' : (given ? 'given' : '')))}`}
        >
            <div className="cell-content">
                {value !== 0 ? (
                    <span className="main-number">{value}</span>
                ) : (
                    <div className="notes-container">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                            const noteColorClass = (colors[0] === 0 && notes.has(num)) ? `color${colors[num]}` : '';
                            
                            return (
                                <div 
                                    key={num} 
                                    className={`note-cell ${noteColorClass} ${notes.has(num) && num === highlightNumber ? 'highlighted-note' : ''} ${notes.has(num) && highlightedHintNumbers.includes(num) ? 'naked-subset-note' : ''}`}
                                >
                                    {notes.has(num) && (
                                        <span className="note-number">{num}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="click-area" onClick={onClick}></div>
        </div>
    );
};

export default Cell;