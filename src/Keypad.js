// src/Keypad.js
import React from 'react';
import './Keypad.css';

const Keypad = ({ onNumberClick, onClearClick, isNoteMode, isContinuousMode, selectedNumber }) => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    return (
        <div className="keypad">
            {numbers.map((number) => (
                <button
                    key={number}
                    className={`keypad-button 
                        ${isContinuousMode && selectedNumber === number ? 'selected-number' : ''}
                    `}
                    onClick={() => onNumberClick(number)}
                >
                    {number}
                </button>
            ))}
            <button className="keypad-button clear-button" onClick={onClearClick}>
                C
            </button>
        </div>
    );
};

export default Keypad;