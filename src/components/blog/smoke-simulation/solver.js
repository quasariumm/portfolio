export const gridSize = 8;
const DENSITY = 0.6;
const DELTA_X = 1.0;
const DELTA_TIME = 0.016;

/*
    Pressure
*/

export function CalculatePressure(cellValues, horizontalArrows, verticalArrows, row, col) {
    // To anyone that is here looking at the source code:
    // This simulation is a simplification that assumes the OOB cells to be solid
    // and does not allow for solid cells in the volume.
    const xEdge = col == 0 || col == 7;
    const yEdge = row == 0 || row == 7;
    const pLeft = xEdge ? 0.0 : cellValues[row][col - 1];
    const pRight = xEdge ? 0.0 : cellValues[row][col + 1];
    const pUp = yEdge ? 0.0 : cellValues[row - 1][col];
    const pDown = yEdge ? 0.0 : cellValues[row + 1][col];

    const vLeft = horizontalArrows[row][col];
    const vRight = col == 7 ? 0.0 : horizontalArrows[row][col + 1];
    const vUp = verticalArrows[row][col];
    const vDown = row == 7 ? 0.0 : verticalArrows[row + 1][col];

    const pressure = pLeft + pRight + pUp + pDown;
    const velocity = vRight - vLeft + vDown - vUp;

    cellValues[row][col] = (pressure - DENSITY * DELTA_X * velocity / DELTA_TIME) / 4.0;
}

export function SolvePressureRedBlack(cellValues, horizontalArrows, verticalArrows) {
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            if (((row + col) & 1) == 0) {
                CalculatePressure(cellValues, horizontalArrows, verticalArrows, row, col);
            }
        }
    }

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            if (((row + col) & 1) == 1) {
                CalculatePressure(cellValues, horizontalArrows, verticalArrows, row, col);
            }
        }
    }
}

/*
    Velocity
*/

export function CalculateVelocities(cellValues, cellSize, horizontalArrows, verticalArrows, svg) {
    const k = DELTA_TIME / DENSITY;

    for (let row = 0; row <= gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            if (row == 0 || row == 8) {
                verticalArrows[row][col] = 0.0;
            } else {
                const pCenter = cellValues[row][col];
                const pUp = cellValues[row - 1][col];
                verticalArrows[row][col] -= k * (pCenter - pUp);
            }
        }
    }

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col <= gridSize; col++) {
            if (col == 0 || col == 8) {
                horizontalArrows[row][col] = 0.0;
            }
            else {
                const pCenter = cellValues[row][col];
                const pLeft = cellValues[row][col - 1];
                horizontalArrows[row][col] -= k * (pCenter - pLeft);
            }
        }
    }

    // Update the arrows
    svg.querySelectorAll("line[data-type]").forEach((line) => {
        const type = line.dataset.type;

        const x1 = parseFloat(line.getAttribute("x1"));
        const y1 = parseFloat(line.getAttribute("y1"));

        if (type === "vertical") {
            const lineIdx = parseInt(line.dataset.lineIdx);
            const col = parseInt(line.dataset.col);

            const newY = y1 + verticalArrows[lineIdx][col] * cellSize;

            line.setAttribute("x2", x1);
            line.setAttribute("y2", newY);

            if (
                line.nextElementSibling &&
                line.nextElementSibling.tagName === "line"
            ) {
                line.nextElementSibling.setAttribute("x2", x1);
                line.nextElementSibling.setAttribute("y2", newY);
            }
        } else {
            const row = parseInt(line.dataset.row);
            const lineIdx = parseInt(line.dataset.lineIdx);

            const newX = x1 + horizontalArrows[row][lineIdx] * cellSize;

            line.setAttribute("x2", newX);
            line.setAttribute("y2", y1);

            if (
                line.nextElementSibling &&
                line.nextElementSibling.tagName === "line"
            ) {
                line.nextElementSibling.setAttribute("x2", newX);
                line.nextElementSibling.setAttribute("y2", y1);
            }
        }
    });
}

/*
    Advection
*/

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function GetVelocityXAtWorldPos(worldPos, cellSize, horizontalArrows) {
    let size = gridSize * cellSize;

    let px = (worldPos[0] + size / 2.0) / cellSize;
    let py = (worldPos[1] + size / 2.0) / cellSize;

    let left = Math.min(Math.max(0.0, Math.trunc(px)), gridSize - 1);
    let right = left + 1;
    let bottom = Math.min(Math.max(0.0, Math.trunc(py)), gridSize - 1);
    let top = bottom + 1;

    let xFrac = (px - left) % 1.0;
    let yFrac = (py - bottom) % 1.0;

    let valueTop = lerp(horizontalArrows[top][left], horizontalArrows[top][right], xFrac);
    let valueBottom = lerp(horizontalArrows[bottom][left], horizontalArrows[bottom][right], xFrac);
    return lerp(valueBottom, valueTop, yFrac);
}

function GetVelocityYAtWorldPos(worldPos, cellSize, verticalArrows) {
    let size = gridSize * cellSize;

    let px = (worldPos[0] + size / 2.0) / cellSize;
    let py = (worldPos[1] + size / 2.0) / cellSize;

    let left = Math.min(Math.max(0.0, Math.trunc(px)), gridSize - 1);
    let right = left + 1;
    let bottom = Math.min(Math.max(0.0, Math.trunc(py)), gridSize - 1);
    let top = bottom + 1;

    let xFrac = (px - left) % 1.0;
    let yFrac = (py - bottom) % 1.0;

    let valueTop = lerp(verticalArrows[top][left], verticalArrows[top][right], xFrac);
    let valueBottom = lerp(verticalArrows[bottom][left], verticalArrows[bottom][right], xFrac);
    return lerp(valueBottom, valueTop, yFrac);
}

export function AdvectVelocities(
    cellSize, 
    horizontalArrows, horizontalArrowsTemp, 
    verticalArrows, verticalArrowsTemp
) {
    for (let row = 0; row <= gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            let pos = [row, col + 0.5];
            let velX = GetVelocityXAtWorldPos(pos, cellSize, horizontalArrows);
            let velY = GetVelocityYAtWorldPos(pos, cellSize, verticalArrows);
            pos[0] -= DELTA_TIME * velX;
            pos[1] -= DELTA_TIME * velY;
            verticalArrowsTemp[row][col] = GetVelocityYAtWorldPos(pos, cellSize, verticalArrows);
        }
    }

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col <= gridSize; col++) {
            let pos = [row + 0.5, col];
            let velX = GetVelocityXAtWorldPos(pos, cellSize, horizontalArrows);
            let velY = GetVelocityYAtWorldPos(pos, cellSize, verticalArrows);
            pos[0] -= DELTA_TIME * velX;
            pos[1] -= DELTA_TIME * velY;
            horizontalArrowsTemp[row][col] = GetVelocityXAtWorldPos(pos, cellSize, horizontalArrows);
        }
    }

    for (let row = 0; row <= gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            verticalArrows[row][col] = verticalArrowsTemp[row][col];
        }
    }

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col <= gridSize; col++) {
            horizontalArrows[row][col] = horizontalArrowsTemp[row][col];
        }
    }
}