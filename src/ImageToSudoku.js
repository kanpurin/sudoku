// src/components/ImageToSudoku.js
import React, { useState, useEffect } from 'react';
import './ImageToSudoku.css';

const CANVAS_OCR_SIZE = 40;
let digitTemplateCache = null;

const loadImageElement = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
});

const normalizeMask = (mask, width, height, size = CANVAS_OCR_SIZE) => {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!mask[y * width + x]) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }

    if (maxX < 0) return null;

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const scale = Math.min((size - 8) / boxWidth, (size - 8) / boxHeight);
    const offsetX = Math.floor((size - boxWidth * scale) / 2);
    const offsetY = Math.floor((size - boxHeight * scale) / 2);
    const normalized = new Uint8Array(size * size);

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (!mask[y * width + x]) continue;
            const nx = Math.round((x - minX) * scale + offsetX);
            const ny = Math.round((y - minY) * scale + offsetY);
            for (let dy = 0; dy <= 1; dy++) {
                for (let dx = 0; dx <= 1; dx++) {
                    const px = nx + dx;
                    const py = ny + dy;
                    if (px >= 0 && px < size && py >= 0 && py < size) {
                        normalized[py * size + px] = 1;
                    }
                }
            }
        }
    }

    return normalized;
};

const buildDigitTemplates = () => {
    if (digitTemplateCache) return digitTemplateCache;

    const fonts = ['Arial', 'Calibri', 'Segoe UI', 'sans-serif'];
    const templates = [];

    for (let digit = 1; digit <= 9; digit++) {
        for (const font of fonts) {
            for (let fontSize = 20; fontSize <= 42; fontSize += 2) {
                const canvas = document.createElement('canvas');
                canvas.width = CANVAS_OCR_SIZE;
                canvas.height = CANVAS_OCR_SIZE;
                const context = canvas.getContext('2d');
                context.fillStyle = 'black';
                context.fillRect(0, 0, CANVAS_OCR_SIZE, CANVAS_OCR_SIZE);
                context.fillStyle = 'white';
                context.font = `${fontSize}px ${font}`;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(String(digit), CANVAS_OCR_SIZE / 2, CANVAS_OCR_SIZE / 2 + 1);

                const data = context.getImageData(0, 0, CANVAS_OCR_SIZE, CANVAS_OCR_SIZE).data;
                const mask = new Uint8Array(CANVAS_OCR_SIZE * CANVAS_OCR_SIZE);
                for (let i = 0; i < mask.length; i++) {
                    mask[i] = data[i * 4] > 80 ? 1 : 0;
                }
                const normalized = normalizeMask(mask, CANVAS_OCR_SIZE, CANVAS_OCR_SIZE);
                if (normalized) templates.push({ digit, mask: normalized });
            }
        }
    }

    digitTemplateCache = templates;
    return templates;
};

const scoreMask = (candidate, template) => {
    let intersection = 0;
    let union = 0;
    for (let i = 0; i < candidate.length; i++) {
        if (candidate[i] || template[i]) union++;
        if (candidate[i] && template[i]) intersection++;
    }
    return union ? intersection / union : 0;
};

const classifyCanvasDigit = (mask, width, height) => {
    const normalized = normalizeMask(mask, width, height);
    if (!normalized) return { digit: '0', score: 0 };

    let bestDigit = '0';
    let bestScore = 0;
    for (const template of buildDigitTemplates()) {
        const score = scoreMask(normalized, template.mask);
        if (score > bestScore) {
            bestScore = score;
            bestDigit = String(template.digit);
        }
    }

    return bestScore >= 0.22 ? { digit: bestDigit, score: bestScore } : { digit: '0', score: bestScore };
};

const getGray = (data, width, x, y) => {
    const i = (y * width + x) * 4;
    return (data[i] + data[i + 1] + data[i + 2]) / 3;
};

const getLineGroups = (counts, lineLength) => {
    const maxCount = Math.max(...counts);
    const threshold = Math.max(lineLength * 0.35, maxCount * 0.45);
    const groups = [];
    let start = -1;

    for (let i = 0; i < counts.length; i++) {
        if (counts[i] >= threshold && start < 0) {
            start = i;
        }
        if (start >= 0 && (counts[i] < threshold || i === counts.length - 1)) {
            const end = counts[i] < threshold ? i - 1 : i;
            groups.push({ start, end, center: (start + end) / 2 });
            start = -1;
        }
    }

    return groups;
};

const chooseRegularLineCenters = (groups, lineCount = 10) => {
    if (groups.length < lineCount) return null;

    let best = null;
    const centers = groups.map(group => group.center);
    for (let start = 0; start <= centers.length - lineCount; start++) {
        const subset = centers.slice(start, start + lineCount);
        const gaps = subset.slice(1).map((center, index) => center - subset[index]);
        const sortedGaps = [...gaps].sort((a, b) => a - b);
        const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)];
        if (medianGap <= 0) continue;

        const maxDeviation = Math.max(...gaps.map(gap => Math.abs(gap - medianGap) / medianGap));
        const spanDeviation = Math.abs((subset[lineCount - 1] - subset[0]) / (medianGap * (lineCount - 1)) - 1);
        const score = maxDeviation + spanDeviation;
        if (maxDeviation <= 0.18 && (!best || score < best.score)) {
            best = { score, centers: subset };
        }
    }

    return best?.centers || null;
};

const findGridBoundsFromLines = (data, width, height) => {
    const columnCounts = new Array(width).fill(0);
    const rowCounts = new Array(height).fill(0);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (getGray(data, width, x, y) >= 180) continue;
            columnCounts[x]++;
            rowCounts[y]++;
        }
    }

    const xGroups = getLineGroups(columnCounts, height);
    const yGroups = getLineGroups(rowCounts, width);
    const xCenters = chooseRegularLineCenters(xGroups);
    const yCenters = chooseRegularLineCenters(yGroups);
    if (xCenters && yCenters) {
        const left = Math.round(xCenters[0]);
        const right = Math.round(xCenters[9]);
        const top = Math.round(yCenters[0]);
        const bottom = Math.round(yCenters[9]);
        const boardWidth = right - left;
        const boardHeight = bottom - top;
        const boardRatio = boardWidth / boardHeight;

        if (boardWidth >= 120 && boardHeight >= 120 && boardRatio >= 0.82 && boardRatio <= 1.18) {
            return { left, top, right, bottom };
        }
    }

    const boxXCenters = chooseRegularLineCenters(xGroups, 4);
    const boxYCenters = chooseRegularLineCenters(yGroups, 4);
    if (!boxXCenters || !boxYCenters) return null;

    const left = Math.round(boxXCenters[0]);
    const right = Math.round(boxXCenters[3]);
    const top = Math.round(boxYCenters[0]);
    const bottom = Math.round(boxYCenters[3]);
    const boardWidth = right - left;
    const boardHeight = bottom - top;
    const boardRatio = boardWidth / boardHeight;
    const coversMostImage = boardWidth >= width * 0.72 && boardHeight >= height * 0.72;

    if (!coversMostImage || boardWidth < 120 || boardHeight < 120 || boardRatio < 0.82 || boardRatio > 1.18) {
        return null;
    }

    return { left, top, right, bottom };
};

const findGridBoundsFromLightArea = (data, width, height) => {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            const saturation = Math.max(r, g, b) - Math.min(r, g, b);
            if (brightness > 160 && saturation < 60) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX < 0) return null;

    return { left: minX, top: minY, right: maxX + 1, bottom: maxY + 1 };
};

const readCleanSudokuScreenshot = async (src) => {
    const img = await loadImageElement(src);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(img, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);

    const bounds = findGridBoundsFromLines(data, width, height) || findGridBoundsFromLightArea(data, width, height);
    if (!bounds) return null;

    const { left, top, right, bottom } = bounds;
    const boardWidth = right - left;
    const boardHeight = bottom - top;
    const boardRatio = boardWidth / boardHeight;
    if (boardWidth < 120 || boardHeight < 120 || boardRatio < 0.82 || boardRatio > 1.18) {
        return null;
    }

    const cellWidth = boardWidth / 9;
    const cellHeight = boardHeight / 9;
    const lines = [];
    const scores = [];
    let recognizedCells = 0;

    for (let row = 0; row < 9; row++) {
        let line = '';
        for (let col = 0; col < 9; col++) {
            const x1 = Math.round(left + col * cellWidth);
            const x2 = Math.round(left + (col + 1) * cellWidth);
            const y1 = Math.round(top + row * cellHeight);
            const y2 = Math.round(top + (row + 1) * cellHeight);
            const margin = Math.max(4, Math.round(Math.min(cellWidth, cellHeight) * 0.16));
            const innerWidth = Math.max(1, x2 - x1 - margin * 2);
            const innerHeight = Math.max(1, y2 - y1 - margin * 2);
            const mask = new Uint8Array(innerWidth * innerHeight);
            let darkPixels = 0;

            for (let y = 0; y < innerHeight; y++) {
                for (let x = 0; x < innerWidth; x++) {
                    const sourceX = x1 + margin + x;
                    const sourceY = y1 + margin + y;
                    const gray = getGray(data, width, sourceX, sourceY);
                    if (gray < 120) {
                        mask[y * innerWidth + x] = 1;
                        darkPixels++;
                    }
                }
            }

            const minDarkPixels = Math.max(12, Math.round(innerWidth * innerHeight * 0.025));
            if (darkPixels < minDarkPixels) {
                line += '0';
                continue;
            }

            const { digit, score } = classifyCanvasDigit(mask, innerWidth, innerHeight);
            if (digit !== '0') {
                recognizedCells++;
                scores.push(score);
            }
            line += digit;
        }
        lines.push(line);
    }

    const averageScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    if (recognizedCells < 8 || averageScore < 0.45) {
        return null;
    }

    return lines.join('\n');
};

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
                    tessedit_char_whitelist: '0123456789',
                    tessedit_pageseg_mode: '10',
                    classify_bln_numeric_mode: '1'
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
            const cleanScreenshotBoard = await readCleanSudokuScreenshot(sudokuImage);
            if (cleanScreenshotBoard) {
                onConvert(cleanScreenshotBoard);
                setStatusMessage('完了！');
                return;
            }

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

def find_grid_from_light_area(gray):
    threshold_value, light = cv.threshold(gray, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
    if threshold_value < 90:
        _, light = cv.threshold(gray, 130, 255, cv.THRESH_BINARY)

    kernel = cv.getStructuringElement(cv.MORPH_RECT, (5, 5))
    light = cv.morphologyEx(light, cv.MORPH_CLOSE, kernel, iterations=2)
    contours, _ = cv.findContours(light, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    image_area = gray.shape[0] * gray.shape[1]
    candidates = []
    for contour in contours:
        x, y, w, h = cv.boundingRect(contour)
        area = w * h
        ratio = w / max(h, 1)
        if area < image_area * 0.25 or area > image_area * 0.98:
            continue
        if ratio < 0.75 or ratio > 1.25:
            continue
        candidates.append((area, x, y, w, h))

    if not candidates:
        return None

    _, x, y, w, h = max(candidates, key=lambda item: item[0])
    side = max(w, h)
    cx = x + w / 2
    cy = y + h / 2
    x1 = max(0, int(round(cx - side / 2)))
    y1 = max(0, int(round(cy - side / 2)))
    x2 = min(gray.shape[1] - 1, int(round(cx + side / 2)))
    y2 = min(gray.shape[0] - 1, int(round(cy + side / 2)))

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
    contour = find_grid_from_light_area(gray)
    if contour is None:
        contour = find_grid_contour(closed, image_area)
    if contour is not None and contour_area_ratio(contour, image_area) > 0.95:
        light_contour = find_grid_from_light_area(gray)
        line_contour = find_grid_from_lines(gray)
        contour = light_contour if light_contour is not None else line_contour if line_contour is not None else contour_as_axis_aligned_rect(contour)

    if contour is None:
        contour = find_grid_from_light_area(gray)
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
    margin = max(4, int(CELL_SIZE * 0.1))
    inner = cell[margin:CELL_SIZE - margin, margin:CELL_SIZE - margin]
    blurred = cv.GaussianBlur(inner, (3, 3), 0)
    _, binary = cv.threshold(blurred, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU)
    binary = remove_grid_lines(binary)

    num_labels, labels, stats, _ = cv.connectedComponentsWithStats(binary, 8)
    digit_mask = np.zeros(binary.shape, dtype=np.uint8)
    area_limit = binary.shape[0] * binary.shape[1]
    components = []
    for label in range(1, num_labels):
        x, y, w, h, area = stats[label]
        if area < 8 or area > area_limit * 0.4:
            continue
        if h < binary.shape[0] * 0.16 or w < binary.shape[1] * 0.04:
            continue
        if x <= 0 or y <= 0 or x + w >= binary.shape[1] or y + h >= binary.shape[0]:
            continue
        components.append(label)

    if not components:
        return None

    for label in components:
        digit_mask[labels == label] = 255

    ys, xs = np.where(digit_mask > 0)
    if len(xs) == 0:
        return None

    x1 = max(0, xs.min() - 2)
    x2 = min(inner.shape[1] - 1, xs.max() + 2)
    y1 = max(0, ys.min() - 2)
    y2 = min(inner.shape[0] - 1, ys.max() + 2)
    digit = digit_mask[y1:y2 + 1, x1:x2 + 1]
    raw_digit = inner[y1:y2 + 1, x1:x2 + 1]
    clean_digit = np.full(raw_digit.shape, 255, dtype=np.uint8)
    clean_digit[digit > 0] = raw_digit[digit > 0]

    h, w = clean_digit.shape
    scale = min(62 / max(w, 1), 74 / max(h, 1))
    resized = cv.resize(clean_digit, (max(1, int(w * scale)), max(1, int(h * scale))), interpolation=cv.INTER_CUBIC)

    canvas = np.full((OCR_SIZE, OCR_SIZE), 255, dtype=np.uint8)
    y = (OCR_SIZE - resized.shape[0]) // 2
    x = (OCR_SIZE - resized.shape[1]) // 2
    canvas[y:y + resized.shape[0], x:x + resized.shape[1]] = resized
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
                const textDigit = result?.data?.text?.match(/[1-9]/)?.[0];
                if (textDigit) {
                    bestDigit = textDigit;
                    maxConfidence = result.data.confidence || 0;
                }

                if (bestDigit === '0' && result && result.data.symbols && result.data.symbols.length > 0) {
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
            <div className="image-to-sudoku-header">
                <h2 className="image-to-sudoku-title">画像読み込み</h2>
                <div className="status-message">
                    {statusMessage}
                </div>
            </div>

            <div className="image-import-actions">
                <label className="image-pick-button">
                    画像を選択
                    <input 
                        type="file" 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="image-upload-input"
                    />
                </label>

                <button 
                    onClick={handleConvert}
                    disabled={!sudokuImage || isConverting}
                    className="convert-button"
                >
                    {isConverting ? '変換中...' : '変換'}
                </button>
            </div>

            {sudokuImage && (
                <div className="image-preview-row">
                    <img 
                        src={sudokuImage} 
                        alt="Uploaded Sudoku" 
                        className="sudoku-image-preview"
                    />
                    <span className="image-preview-label">選択済み</span>
                </div>
            )}
        </div>
    );
};

export default ImageToSudoku;
