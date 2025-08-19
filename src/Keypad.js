// src/Keypad.js
import React, { useRef } from 'react';
import './Keypad.css';

const Keypad = ({ onNumberClick, onClearClick, onLongPressToggle, isNoteMode, isContinuousMode, selectedNumber }) => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const pressTimer = useRef(null);

    const handlePressStart = (number) => {
        // 0.5秒後に長押しハンドラを実行
        pressTimer.current = setTimeout(() => {
            onLongPressToggle(number); // 長押しされた数字を渡す
        }, 500);
    };

    const handlePressEnd = () => {
        // 指を離したらタイマーをクリア
        clearTimeout(pressTimer.current);
    };

    return (
        <div className="keypad">
            {numbers.map((number) => (
                <button
                    key={number}
                    className={`keypad-button 
                        ${isContinuousMode && selectedNumber === number ? 'selected-number' : ''}
                    `}
                    onClick={() => onNumberClick(number)}
                    onMouseDown={() => handlePressStart(number)}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onTouchStart={() => handlePressStart(number)}
                    onTouchEnd={handlePressEnd}
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