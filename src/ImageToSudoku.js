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
import json

GRID_SIZE = 450
CELL_SIZE = GRID_SIZE // 9
OCR_SIZE = 96

def order_points(points):
    pts = points.reshape(4, 2).astype("float32")
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def find_grid_contour(thresh, image_area):
    contours, _ = cv.findContours(thresh, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    candidates = []

    for contour in contours:
        area = cv.contourArea(contour)
        if area < image_area * 0.08:
            continue

        peri = cv.arcLength(contour, True)
        approx = cv.approxPolyDP(contour, 0.02 * peri, True)
        if len(approx) == 4 and cv.isContourConvex(approx):
            candidates.append((area, approx))

    if candidates:
        return max(candidates, key=lambda item: item[0])[1]

    if contours:
        largest = max(contours, key=cv.contourArea)
        if cv.contourArea(largest) >= image_area * 0.08:
            rect = cv.minAreaRect(largest)
            return cv.boxPoints(rect).astype("float32").reshape(4, 1, 2)

    return None

def contour_area_ratio(contour, image_area):
    if contour is None:
        return 0
    return cv.contourArea(contour.astype("float32")) / image_area

def contour_as_axis_aligned_rect(contour):
    x, y, w, h = cv.boundingRect(contour.astype("float32"))
    return np.array(
        [[[x, y]], [[x + w, y]], [[x + w, y + h]], [[x, y + h]]],
        dtype="float32"
    )

def find_grid_from_lines(gray):
    blurred = cv.GaussianBlur(gray, (3, 3), 0)
    thresh = cv.adaptiveThreshold(
        blurred,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        21,
        4
    )

    min_dim = min(gray.shape[:2])
    line_length = max(18, min_dim // 4)
    horizontal_kernel = cv.getStructuringElement(cv.MORPH_RECT, (line_length, 1))
    vertical_kernel = cv.getStructuringElement(cv.MORPH_RECT, (1, line_length))
    horizontal = cv.morphologyEx(thresh, cv.MORPH_OPEN, horizontal_kernel)
    vertical = cv.morphologyEx(thresh, cv.MORPH_OPEN, vertical_kernel)
    grid_mask = cv.bitwise_or(horizontal, vertical)

    points = cv.findNonZero(grid_mask)
    if points is None:
        return None

    x, y, w, h = cv.boundingRect(points)
    if w < min_dim * 0.55 or h < min_dim * 0.55:
        return None

    ratio = w / max(h, 1)
    if ratio < 0.75 or ratio > 1.25:
        return None

    pad = max(2, int(min_dim * 0.01))
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(gray.shape[1] - 1, x + w + pad)
    y2 = min(gray.shape[0] - 1, y + h + pad)

    return np.array(
        [[[x1, y1]], [[x2, y1]], [[x2, y2]], [[x1, y2]]],
        dtype="float32"
    )

def warp_grid(img):
    gray = cv.cvtColor(img, cv.COLOR_BGR2GRAY)
    gray = cv.equalizeHist(gray)
    blurred = cv.GaussianBlur(gray, (5, 5), 0)
    thresh = cv.adaptiveThreshold(
        blurred,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        15,
        2
    )
    kernel = cv.getStructuringElement(cv.MORPH_RECT, (3, 3))
    closed = cv.morphologyEx(thresh, cv.MORPH_CLOSE, kernel, iterations=1)
    image_area = img.shape[0] * img.shape[1]
    contour = find_grid_contour(closed, image_area)
    if contour is not None and contour_area_ratio(contour, image_area) > 0.95:
        line_contour = find_grid_from_lines(gray)
        contour = line_contour if line_contour is not None else contour_as_axis_aligned_rect(contour)

    if contour is None:
        contour = find_grid_from_lines(gray)
        if contour is None:
            return None

    rect = order_points(contour)
    dst = np.array(
        [[0, 0], [GRID_SIZE - 1, 0], [GRID_SIZE - 1, GRID_SIZE - 1], [0, GRID_SIZE - 1]],
        dtype="float32"
    )
    matrix = cv.getPerspectiveTransform(rect, dst)
    return cv.warpPerspective(gray, matrix, (GRID_SIZE, GRID_SIZE))

def remove_grid_lines(binary):
    horizontal_kernel = cv.getStructuringElement(cv.MORPH_RECT, (18, 1))
    vertical_kernel = cv.getStructuringElement(cv.MORPH_RECT, (1, 18))
    horizontal = cv.morphologyEx(binary, cv.MORPH_OPEN, horizontal_kernel)
    vertical = cv.morphologyEx(binary, cv.MORPH_OPEN, vertical_kernel)
    grid = cv.bitwise_or(horizontal, vertical)
    return cv.bitwise_and(binary, cv.bitwise_not(grid))

def prepare_cell_image(cell):
    margin = int(CELL_SIZE * 0.16)
    inner = cell[margin:CELL_SIZE - margin, margin:CELL_SIZE - margin]
    inner = cv.GaussianBlur(inner, (3, 3), 0)
    binary = cv.adaptiveThreshold(
        inner,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        21,
        8
    )
    binary = remove_grid_lines(binary)

    num_labels, labels, stats, _ = cv.connectedComponentsWithStats(binary, 8)
    digit_mask = np.zeros(binary.shape, dtype=np.uint8)
    components = []
    area_limit = binary.shape[0] * binary.shape[1]

    for label in range(1, num_labels):
        x, y, w, h, area = stats[label]
        if area < 12 or area > area_limit * 0.55:
            continue
        if h < binary.shape[0] * 0.18 or w < binary.shape[1] * 0.06:
            continue
        if x <= 1 or y <= 1 or x + w >= binary.shape[1] - 1 or y + h >= binary.shape[0] - 1:
            continue
        components.append((x, y, w, h, area, label))

    if not components:
        return None

    for _, _, _, _, _, label in components:
        digit_mask[labels == label] = 255

    ys, xs = np.where(digit_mask > 0)
    if len(xs) == 0:
        return None

    x1, x2 = xs.min(), xs.max()
    y1, y2 = ys.min(), ys.max()
    digit = digit_mask[y1:y2 + 1, x1:x2 + 1]

    h, w = digit.shape
    scale = min(68 / max(w, 1), 76 / max(h, 1))
    resized = cv.resize(digit, (max(1, int(w * scale)), max(1, int(h * scale))), interpolation=cv.INTER_AREA)

    canvas = np.full((OCR_SIZE, OCR_SIZE), 255, dtype=np.uint8)
    digit_black = 255 - resized
    y = (OCR_SIZE - digit_black.shape[0]) // 2
    x = (OCR_SIZE - digit_black.shape[1]) // 2
    canvas[y:y + digit_black.shape[0], x:x + digit_black.shape[1]] = digit_black
    return canvas

def process_sudoku_image(img_bytes):
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv.imdecode(nparr, cv.IMREAD_COLOR)
    if img is None:
        return "[]"

    warped = warp_grid(img)
    if warped is None:
        return "[]"

    cell_images = []
    for row in range(9):
        for col in range(9):
            y1 = row * CELL_SIZE
            x1 = col * CELL_SIZE
            cell = warped[y1:y1 + CELL_SIZE, x1:x1 + CELL_SIZE]
            prepared = prepare_cell_image(cell)

            if prepared is None:
                cell_images.append({"image": None})
                continue

            _, encoded_img = cv.imencode('.png', prepared)
            cell_images.append({"image": base64.b64encode(encoded_img).decode('utf-8')})

    return json.dumps(cell_images)

cell_images = process_sudoku_image(img_bytes_py)
(cell_images)
            `;

            const cellImages = JSON.parse(await pyodide.runPython(pythonCode));
            if (cellImages.length === 0) {
                setStatusMessage('エラー: 盤面が見つかりませんでした。');
                setIsConverting(false);
                return;
            }

            setStatusMessage('数字を認識中...');
            
            const ocrPromises = cellImages.map(cell => {
                if (!cell.image) return Promise.resolve(null);
                // 各セル画像の認識ごとにパラメータを再設定
                // これにより、認識対象が1-9の数字のみに限定される
                return worker.recognize(`data:image/png;base64,${cell.image}`, {
                    tessedit_char_whitelist: '123456789',
                    tessedit_pageseg_mode: '10',
                    classify_bln_numeric_mode: '1'
                });
            });

            const ocrResults = await Promise.all(ocrPromises);

            let digits = [];
            for (let i = 0; i < ocrResults.length; i++) {
                const result = ocrResults[i];
                let bestDigit = '0';
                let maxConfidence = 0;
                
                // OCR結果から最も信頼度の高い数字を抽出
                const textDigit = result?.data?.text?.match(/[1-9]/)?.[0];
                if (textDigit) {
                    bestDigit = textDigit;
                    maxConfidence = result.data.confidence || 0;
                }

                if (result && result.data.symbols && result.data.symbols.length > 0) {
                    const symbolChoices = result.data.symbols[0].choices;
                    const sortedChoices = (symbolChoices || [])
                        .filter(choice => choice.text.match(/^[1-9]$/))
                        .sort((a, b) => b.confidence - a.confidence);
                    
                    if (sortedChoices.length > 0) {
                        bestDigit = sortedChoices[0].text;
                        maxConfidence = sortedChoices[0].confidence;
                    }
                }
                
                // 信頼度が低い場合は0と判断
                if (maxConfidence < 35) { 
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
