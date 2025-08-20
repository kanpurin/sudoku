// src/Keypad.js
import React, { useRef, useState, useEffect } from 'react';
import './Keypad.css';

const Keypad = ({
    onNumberClick,
    onClearClick,
    onLongPressToggle,
    isNoteMode,
    selectedNumber,
    toggleNoteMode,
    handleUndoClick,
    handleRedoClick,
    historyIndex,
    historyLength
}) => {
    // useRefとuseStateを再定義
    const timeoutRef = useRef(null);
    const [isLongPress, setIsLongPress] = useState(false);

    const handleTouchStart = (e, number) => {
        // e.preventDefault();
        setIsLongPress(false);
        timeoutRef.current = setTimeout(() => {
            onLongPressToggle(number);
            setIsLongPress(true);
        }, 500); // 500msで長押しと判定
    };

    const handleTouchEnd = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const handleNumberClickInternal = (number) => {
        if (isLongPress) {
            setIsLongPress(false);
            return;
        }
        onNumberClick(number);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    return (
        <div className="keypad-container">
            <div className="keypad">
                {numbers.map(number => (
                    <div
                        key={number}
                        className={`key ${selectedNumber === number ? 'continuous-active' : ''}`}
                        onClick={() => handleNumberClickInternal(number)}
                        onMouseDown={e => handleTouchStart(e, number)}
                        onMouseUp={handleTouchEnd}
                        onMouseLeave={handleTouchEnd}
                        onTouchStart={e => handleTouchStart(e, number)}
                        onTouchEnd={handleTouchEnd}
                    >
                        {number}
                    </div>
                ))}
                <div 
                    className={`key note-key ${isNoteMode ? 'active' : ''}`}
                    onClick={toggleNoteMode}
                >
                    メモ
                </div>
                <div 
                    className={`key undo-key ${historyIndex === 0 ? 'disabled' : ''}`}
                    onClick={handleUndoClick}
                >
                    戻る
                </div>
                <div 
                    className={`key redo-key ${historyIndex === historyLength - 1 ? 'disabled' : ''}`}
                    onClick={handleRedoClick}
                >
                    やり直し
                </div>
                <div className="key clear-key" onClick={onClearClick}>
                    クリア
                </div>
            </div>
        </div>
    );
};

export default Keypad;