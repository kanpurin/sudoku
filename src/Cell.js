// src/Cell.js
import React from 'react';
import './Cell.css';

const Cell = ({ value, given, onClick, isSelected, isError }) => {
    return (
        <div
            className={`cell ${given ? 'given' : ''} ${isSelected ? 'selected' : ''} ${isError ? 'error' : ''}`}
            onClick={onClick}
        >
            {value !== 0 ? value : ''}
        </div>
    );
};

export default Cell;