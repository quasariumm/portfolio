import { gridSize } from "./solver";

export function ConfigureSVG(svg, cellSize, startDrag) {
    svg.setAttribute("width", gridSize * cellSize);
    svg.setAttribute("height", gridSize * cellSize);

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "marker"
    );
    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("refX", "5");
    marker.setAttribute("refY", "2");
    marker.setAttribute("orient", "auto");
    const polygon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polygon"
    );
    polygon.setAttribute("points", "0 0, 6 2, 0 4");
    polygon.setAttribute("fill", "#4a90e2");
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Create vertical arrows
    for (let lineIdx = 0; lineIdx <= gridSize; lineIdx++) {
        for (let col = 0; col < gridSize; col++) {
            const x = col * cellSize + cellSize / 2;
            const y = lineIdx * cellSize;
            createVerticalArrow(svg, startDrag, lineIdx, col, x, y);
        }
    }

    // Create horizontal arrows
    for (let row = 0; row < gridSize; row++) {
        for (let lineIdx = 0; lineIdx <= gridSize; lineIdx++) {
            const x = lineIdx * cellSize;
            const y = row * cellSize + cellSize / 2;
            createHorizontalArrow(svg, startDrag, row, lineIdx, x, y);
        }
    }
}

function createVerticalArrow(svg, startDrag, lineIdx, col, x, y) {
    const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
    );
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", "3");
    circle.setAttribute("fill", "#4a90e2");
    svg.appendChild(circle);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", y);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#4a90e2");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("marker-end", "url(#arrowhead)");
    line.dataset.type = "vertical";
    line.dataset.lineIdx = lineIdx;
    line.dataset.col = col;
    svg.appendChild(line);

    const hitArea = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
    );
    hitArea.setAttribute("x1", x);
    hitArea.setAttribute("y1", y);
    hitArea.setAttribute("x2", x);
    hitArea.setAttribute("y2", y);
    hitArea.setAttribute("stroke", "transparent");
    hitArea.setAttribute("stroke-width", "10");
    hitArea.style.pointerEvents = "all";
    hitArea.style.cursor = "grab";
    hitArea.dataset.type = "vertical";
    hitArea.dataset.lineIdx = lineIdx;
    hitArea.dataset.col = col;
    svg.appendChild(hitArea);

    hitArea.addEventListener("mousedown", startDrag);
}

function createHorizontalArrow(svg, startDrag, row, lineIdx, x, y) {
    const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
    );
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", "3");
    circle.setAttribute("fill", "#4a90e2");
    svg.appendChild(circle);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", y);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#4a90e2");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("marker-end", "url(#arrowhead)");
    line.dataset.type = "horizontal";
    line.dataset.row = row;
    line.dataset.lineIdx = lineIdx;
    svg.appendChild(line);

    const hitArea = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
    );
    hitArea.setAttribute("x1", x);
    hitArea.setAttribute("y1", y);
    hitArea.setAttribute("x2", x);
    hitArea.setAttribute("y2", y);
    hitArea.setAttribute("stroke", "transparent");
    hitArea.setAttribute("stroke-width", "30");
    hitArea.style.pointerEvents = "all";
    hitArea.style.cursor = "grab";
    hitArea.dataset.type = "horizontal";
    hitArea.dataset.row = row;
    hitArea.dataset.lineIdx = lineIdx;
    svg.appendChild(hitArea);

    hitArea.addEventListener("mousedown", startDrag);
}


export function ResetPressure(cellValues, horizontalArrows, verticalArrows, svg) {
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            cellValues[row][col] = 0;
        }
    }

    for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (i < gridSize + 1) verticalArrows[i][j] = 0;
            if (i < gridSize && j <= gridSize) horizontalArrows[i][j] = 0;
        }
    }

    document.querySelectorAll(".cell").forEach((cell) => {
        cell.textContent = "0.00";
        cell.style.backgroundColor = "rgba(0,0,0,0)";
        if (document.documentElement.classList.contains("dark")) {
            cell.style.color = "var(--color-text-dark)";
        } else {
            cell.style.color = "var(--color-text)";
        }
    });

    svg.querySelectorAll("line[data-type]").forEach((line) => {
        const x1 = parseFloat(line.getAttribute("x1"));
        const y1 = parseFloat(line.getAttribute("y1"));
        const type = line.dataset.type;
        line.setAttribute("x2", x1);
        line.setAttribute("y2", y1);

        if (
            line.nextElementSibling &&
            line.nextElementSibling.tagName === "line"
        ) {
            const hitArea = line.nextElementSibling;
            if (type === "vertical") {
                hitArea.setAttribute("x2", x1);
                hitArea.setAttribute("y2", y1 + 15); // 15px minimum
            } else {
                hitArea.setAttribute("x2", x1 + 15); // 15px minimum
                hitArea.setAttribute("y2", y1);
            }
        }
    });
}

export function RandomiseVelocities(cellValues, horizontalArrows, verticalArrows, svg, cellSize) {
    ResetPressure(cellValues, horizontalArrows, verticalArrows, svg);
    svg.querySelectorAll("line[data-type]").forEach((line) => {
        const type = line.dataset.type;
        const maxLength = cellSize;
        const magnitude = (Math.random() - 0.5) * 0.8;

        const x1 = parseFloat(line.getAttribute("x1"));
        const y1 = parseFloat(line.getAttribute("y1"));

        if (type === "vertical") {
            const lineIdx = parseInt(line.dataset.lineIdx);
            const col = parseInt(line.dataset.col);
            const newY = y1 + magnitude * maxLength;

            line.setAttribute("x2", x1);
            line.setAttribute("y2", newY);

            if (
                line.nextElementSibling &&
                line.nextElementSibling.tagName === "line"
            ) {
                line.nextElementSibling.setAttribute("x2", x1);
                line.nextElementSibling.setAttribute("y2", newY);
            }

            verticalArrows[lineIdx][col] = magnitude;
        } else {
            const row = parseInt(line.dataset.row);
            const lineIdx = parseInt(line.dataset.lineIdx);
            const newX = x1 + magnitude * maxLength;

            line.setAttribute("x2", newX);
            line.setAttribute("y2", y1);

            if (
                line.nextElementSibling &&
                line.nextElementSibling.tagName === "line"
            ) {
                line.nextElementSibling.setAttribute("x2", newX);
                line.nextElementSibling.setAttribute("y2", y1);
            }

            horizontalArrows[row][lineIdx] = magnitude;
        }
    });
}