// src/components/ImageToSudoku.js
import React, { useState, useEffect } from 'react';
import './ImageToSudoku.css';

// ナンプレ画像からテキストへの変換を行うコンポーネント
const ImageToSudoku = ({ onConvert }) => {
    const [statusMessage, setStatusMessage] = useState('初期化中...');
    const [sudokuImage, setSudokuImage] = useState(null);
    const [isConverting, setIsConverting] = useState(false);
    const [pyodide, setPyodide] = useState(null);
    const [worker, setWorker] = useState(null);

    // PyodideとTesseractの初期化
    useEffect(() => {
        const initialize = async () => {
            try {
                // windowオブジェクトからPyodideとTesseractを取得
                const pyodideInstance = await window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/" });
                await pyodideInstance.loadPackage("opencv-python");
                setPyodide(pyodideInstance);

                const tesseractWorker = await window.Tesseract.createWorker();
                await tesseractWorker.loadLanguage('eng');
                await tesseractWorker.initialize('eng');
                
                // OCRの認識対象を数字に限定する
                await tesseractWorker.setParameters({
                    tessedit_char_whitelist: '0123456789'
                });
                
                setWorker(tesseractWorker);
                setStatusMessage('準備完了！画像をアップロードしてください。');
            } catch (error) {
                setStatusMessage(`初期化エラー: ${error.message}`);
                console.error("Initialization failed:", error);
            }
        };
        if (window.loadPyodide && window.Tesseract) {
            initialize();
        } else {
            setStatusMessage('CDNスクリプトの読み込みを待機中...');
            window.addEventListener('load', initialize);
        }
    }, []);

    // 画像アップロードのハンドラ
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setSudokuImage(event.target.result);
                setStatusMessage('画像をアップロードしました。');
            };
            reader.readAsDataURL(file);
        }
    };

    // 変換処理
    const handleConvert = async () => {
        if (!sudokuImage || isConverting) return;
        setIsConverting(true);
        setStatusMessage('画像処理中...');

        try {
            const blob = await fetch(sudokuImage).then(res => res.blob());
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const imgBytesPy = pyodide.toPy(uint8Array);
            pyodide.globals.set('img_bytes_py', imgBytesPy);

            const pythonCode = `
import cv2 as cv
import numpy as np
import base64

def process_sudoku_image(img_bytes):
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv.imdecode(nparr, cv.IMREAD_COLOR)

    if img is None: return []

    gray = cv.cvtColor(img, cv.COLOR_BGR2GRAY)
    blurred = cv.GaussianBlur(gray, (5, 5), 0)
    thresh = cv.adaptiveThreshold(blurred, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2)
    contours, _ = cv.findContours(thresh, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)
    
    max_area = 0
    sudoku_contour = None
    for contour in contours:
        area = cv.contourArea(contour)
        if area > 2000:
            peri = cv.arcLength(contour, True)
            approx = cv.approxPolyDP(contour, 0.02 * peri, True)
            if len(approx) == 4 and area > max_area:
                max_area = area
                sudoku_contour = approx
    
    if sudoku_contour is None: return []

    pts = sudoku_contour.reshape(4, 2)
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    
    (tl, tr, br, bl) = rect
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    
    dst = np.array([[0, 0], [maxWidth - 1, 0], [maxWidth - 1, maxHeight - 1], [0, maxHeight - 1]], dtype="float32")
    M = cv.getPerspectiveTransform(rect, dst)
    warped_sudoku_grid = cv.warpPerspective(img, M, (maxWidth, maxHeight))
    
    tl_orig = rect[0].astype(int)
    tr_orig = rect[1].astype(int)
    bl_orig = rect[3].astype(int)
    
    width_orig = np.sqrt(((tr_orig[0] - tl_orig[0]) ** 2) + ((tr_orig[1] - tl_orig[1]) ** 2))
    height_orig = np.sqrt(((bl_orig[0] - tl_orig[0]) ** 2) + ((bl_orig[1] - tl_orig[1]) ** 2))

    cell_w_orig = width_orig / 9
    cell_h_orig = height_orig / 9

    cell_images = []
    for row in range(9):
        for col in range(9):
            center_x_orig = int(tl_orig[0] + col * cell_w_orig + cell_w_orig / 2)
            center_y_orig = int(tl_orig[1] + row * cell_h_orig + cell_h_orig / 2)
            pad_w = int(cell_w_orig * 0.4)
            pad_h = int(cell_h_orig * 0.4)
            x1 = max(0, center_x_orig - pad_w)
            y1 = max(0, center_y_orig - pad_h)
            x2 = min(img.shape[1], center_x_orig + pad_w)
            y2 = min(img.shape[0], center_y_orig + pad_h)

            if x2 <= x1 or y2 <= y1:
                _, encoded_img = cv.imencode('.png', np.zeros((50, 50), dtype=np.uint8))
                cell_images.append(base64.b64encode(encoded_img).decode('utf-8'))
                continue

            cell = img[y1:y2, x1:x2]
            if cell.size == 0:
                _, encoded_img = cv.imencode('.png', np.zeros((50, 50), dtype=np.uint8))
                cell_images.append(base64.b64encode(encoded_img).decode('utf-8'))
                continue
            
            cell_gray = cv.cvtColor(cell, cv.COLOR_BGR2GRAY)
            cell_thresh = cv.adaptiveThreshold(cell_gray, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2)
            cell_resized = cv.resize(cell_thresh, (50, 50), interpolation=cv.INTER_AREA)

            _, encoded_img = cv.imencode('.png', cell_resized)
            cell_images.append(base64.b64encode(encoded_img).decode('utf-8'))
    
    return cell_images

cell_images = process_sudoku_image(img_bytes_py)
(cell_images)
            `;

            const cellImagesBase64 = await pyodide.runPython(pythonCode);
            if (cellImagesBase64.length === 0) {
                setStatusMessage('エラー: 盤面が見つかりませんでした。');
                setIsConverting(false);
                return;
            }

            setStatusMessage('数字を認識中...');
            
            const ocrPromises = cellImagesBase64.map(base64 => {
                if (!base64) return Promise.resolve(null);
                // 各セル画像の認識ごとにパラメータを再設定
                // これにより、認識対象が1-9の数字のみに限定される
                return worker.recognize(`data:image/png;base64,${base64}`, {
                    tessedit_char_whitelist: '123456789'
                });
            });

            const ocrResults = await Promise.all(ocrPromises);

            let digits = [];
            for (let i = 0; i < ocrResults.length; i++) {
                const result = ocrResults[i];
                let bestDigit = '0';
                let maxConfidence = 0;
                
                // OCR結果から最も信頼度の高い数字を抽出
                if (result && result.data.symbols && result.data.symbols.length > 0) {
                    const symbolChoices = result.data.symbols[0].choices;
                    const sortedChoices = symbolChoices
                        .filter(choice => choice.text.match(/^[1-9]$/))
                        .sort((a, b) => b.confidence - a.confidence);
                    
                    if (sortedChoices.length > 0) {
                        bestDigit = sortedChoices[0].text;
                        maxConfidence = sortedChoices[0].confidence;
                    }
                }
                
                // 信頼度が低い場合は0と判断
                if (maxConfidence < 0.50) { 
                    bestDigit = '0';
                }
                digits.push(bestDigit);
            }
            
            let displayText = "";
            for (let i = 0; i < 9; i++) {
                displayText += digits.slice(i * 9, (i + 1) * 9).join('');
                if (i < 8) displayText += '\n';
            }

            onConvert(displayText);
            setStatusMessage('完了！');
        } catch (error) {
            setStatusMessage(`変換エラー: ${error.message}`);
            console.error("Conversion failed:", error);
        } finally {
            setIsConverting(false);
        }
    };

    return (
        <div className="image-to-sudoku-container">
            <h2 className="image-to-sudoku-title">画像から盤面を読み込む(精度△)</h2>
            <div className="status-message">
                {statusMessage}
            </div>
            
            <input 
                type="file" 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="image-upload-input"
            />
            
            {sudokuImage && (
                <img 
                    src={sudokuImage} 
                    alt="Uploaded Sudoku" 
                    className="sudoku-image-preview"
                />
            )}
            
            <button 
                onClick={handleConvert}
                disabled={!sudokuImage || isConverting}
                className="convert-button"
            >
                {isConverting ? '変換中...' : '画像をテキストに変換'}
            </button>
        </div>
    );
};

export default ImageToSudoku;