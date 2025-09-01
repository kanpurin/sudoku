// src/utils/solveAdvanced.js

/**
 * メモの状態から2部グラフを構築し、最短経路を探索して推論結果を出力する
 * @param {boolean[][][]} memo - 各セルのメモの状態 (r, c, num)
 */
const solveAdvanced = (memo) => {
    // メモの情報を抽出し、1次元のインデックスに変換
    const v = [];
    const rowCount = Array(9).fill(0).map(() => Array(9).fill(0));
    const colCount = Array(9).fill(0).map(() => Array(9).fill(0));
    const boxCount = Array(9).fill(0).map(() => Array(9).fill(0));
    const cellCount = Array(81).fill(0);

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            for (let num = 0; num < 9; num++) {
                if (memo[r][c][num]) {
                    v.push(r * 81 + c * 9 + num);
                    rowCount[r][num]++;
                    colCount[c][num]++;
                    boxCount[Math.floor(r / 3) * 3 + Math.floor(c / 3)][num]++;
                    cellCount[r * 9 + c]++;
                }
            }
        }
    }

    const n = v.length;
    if (n === 0) {
        return;
    }

    // 強リンク、弱リンクを辺とするグラフを構築
    // g: 通常のグラフ, rg: 逆向きのグラフ
    const g = Array(2 * n).fill(0).map(() => []);
    const rg = Array(2 * n).fill(0).map(() => []);

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const r1 = Math.floor(v[i] / 81);
            const c1 = Math.floor((v[i] / 9) % 9);
            const num1 = v[i] % 9;
            const r2 = Math.floor(v[j] / 81);
            const c2 = Math.floor((v[j] / 9) % 9);
            const num2 = v[j] % 9;

            // 強リンクの条件
            // 1. 同じ行かつ同じ数字で、その数がその行に2回だけ
            if (r1 === r2 && num1 === num2 && rowCount[r1][num1] === 2) {
                g[i].push(j + n);
                g[j].push(i + n);
                rg[i + n].push(j);
                rg[j + n].push(i);
            }
            // 2. 同じ列かつ同じ数字で、その数がその列に2回だけ
            if (c1 === c2 && num1 === num2 && colCount[c1][num1] === 2) {
                g[i].push(j + n);
                g[j].push(i + n);
                rg[i + n].push(j);
                rg[j + n].push(i);
            }
            // 3. 同じボックスかつ同じ数字で、その数がそのボックスに2回だけ
            if (Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3) && num1 === num2 && boxCount[Math.floor(r1 / 3) * 3 + Math.floor(c1 / 3)][num1] === 2) {
                g[i].push(j + n);
                g[j].push(i + n);
                rg[i + n].push(j);
                rg[j + n].push(i);
            }
            // 4. 同じセルで、そのセルのメモは2つだけ
            if (r1 === r2 && c1 === c2 && cellCount[r1 * 9 + c1] === 2) {
                g[i].push(j + n);
                g[j].push(i + n);
                rg[i + n].push(j);
                rg[j + n].push(i);
            }
            // 弱リンクの条件
            // 1. 同じ行かつ同じ数字で、その数がその行に2回以上
            if (r1 === r2 && num1 === num2 && rowCount[r1][num1] >= 2) {
                g[i + n].push(j);
                g[j + n].push(i);
                rg[i].push(j + n);
                rg[j].push(i + n);
            }
            // 2. 同じ列かつ同じ数字で、その数がその列に2回以上
            if (c1 === c2 && num1 === num2 && colCount[c1][num1] >= 2) {
                g[i + n].push(j);
                g[j + n].push(i);
                rg[i].push(j + n);
                rg[j].push(i + n);
            }
            // 3. 同じボックスかつ同じ数字で、その数がそのボックスに2回以上
            if (Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3) && num1 === num2 && boxCount[Math.floor(r1 / 3) * 3 + Math.floor(c1 / 3)][num1] >= 2) {
                g[i + n].push(j);
                g[j + n].push(i);
                rg[i].push(j + n);
                rg[j].push(i + n);
            }
            // 4. 同じセルで、そのセルのメモは2つ以上
            if (r1 === r2 && c1 === c2 && cellCount[r1 * 9 + c1] >= 2) {
                g[i + n].push(j);
                g[j + n].push(i);
                rg[i].push(j + n);
                rg[j].push(i + n);
            }
        }
    }

    // 任意の2頂点間の最短距離を求める（BFS）
    const dist = Array(2 * n).fill(0).map(() => Array(2 * n).fill(-1));
    for (let s = 0; s < 2 * n; s++) {
        dist[s][s] = 0;
        const queue = [s];
        let head = 0;
        while(head < queue.length) {
            const u = queue[head++];
            for (const v of g[u]) {
                if (dist[s][v] === -1) {
                    dist[s][v] = dist[s][u] + 1;
                    queue.push(v);
                }
            }
        }
    }

    let minLength = -1;
    let resultPair = [-1, -1];

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < g[i + n].length; j++) {
            for (let k = j + 1; k < g[i + n].length; k++) {
                const v1 = g[i + n][j];
                const v2 = g[i + n][k];
                const d = dist[v1][v2 + n];
                if (d !== -1) {
                    if (minLength === -1 || minLength > d) {
                        minLength = d;
                        resultPair = [v1, v2];
                    }
                }
            }
        }
    }

    // 経路復元
    if (minLength !== -1) {
        let pathIndices = [];
        let u = resultPair[1] + n;
        pathIndices.push(u);
        while (u !== resultPair[0]) {
            for (const neighbor of rg[u]) {
                if (dist[resultPair[0]][neighbor] === dist[resultPair[0]][u] - 1) {
                    pathIndices.push(neighbor);
                    u = neighbor;
                    break;
                }
            }
        }
        pathIndices.reverse();

        const path = [];
        for (let i = 0; i < pathIndices.length; i++) {
            const p = pathIndices[i];
            const r = Math.floor(v[p % n] / 81);
            const c = Math.floor((v[p % n] / 9) % 9);
            const num = v[p % n] % 9;
            
            if (i > 0) {
                const prevP = pathIndices[i - 1];
                const type = (p < n && prevP >= n) || (p >= n && prevP < n) ? 'strong' : 'weak';
                path.push({
                    start: { r: Math.floor(v[prevP % n] / 81), c: Math.floor((v[prevP % n] / 9) % 9), num: v[prevP % n] % 9 },
                    end: { r, c, num },
                    type
                });
            }
        }
        
        return path;

    } else {
        return null;
    }
};

export default solveAdvanced;