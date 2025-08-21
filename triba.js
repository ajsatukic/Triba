const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");

let points = [];
let selected = [];
let currentPlayer = 0; // 0 = A (pink), 1 = B (cyan)
let drawnTriangles = []; // { pts: [p0,p1,p2], player: 0|1 }
let m = 0, n = 0;

// --- Start a new game ---
function newGame() {
  points = [];
  selected = [];
  drawnTriangles = [];
  currentPlayer = 0;

  // Re-enable click handler (in case it was removed at GAME OVER)
  canvas.removeEventListener("click", handleClick);
  canvas.addEventListener("click", handleClick);

  const selection = document.getElementById("boardSize").value;

  if (selection === "4x6") { m = 4; n = 6; drawGridMatrix(m, n); }
  else if (selection === "6x8") { m = 6; n = 8; drawGridMatrix(m, n); }
  else if (selection === "8x10") { m = 8; n = 10; drawGridMatrix(m, n); }
  else { 
    drawGridSpiral(); // custom -> spiral
  }

  statusText.textContent = "Player A's turn";
  redrawAll();

  // Ako odmah na startu nema poteza, završi igru (ujednačeno ponašanje)
  if (!playerHasMove()) {
    showGameOverForCurrentNoMove();
  }
}

// --- MATRIX grid generator (4x6, 6x8, 8x10) ---
function drawGridMatrix(rows, cols) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  points = [];
  const dx = canvas.width  / (cols + 1);
  const dy = canvas.height / (rows + 1);

  for (let i = 1; i <= rows; i++) {
    for (let j = 1; j <= cols; j++) {
      const x = j * dx;
      const y = i * dy;
      points.push({ x, y, active: true });
      drawPoint(x, y);
    }
  }
}

// --- SPIRAL grid generator (custom) ---
function drawGridSpiral() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  points = [];

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Sve tačke unutar canvasa:
  const margin = 36;
  const maxR = Math.min(canvas.width, canvas.height) / 2 - margin;

  const numPoints  = 70;     // više tačaka
  const angleStep  = 0.5;    // koračanje ugla (rad)
  const baseRadius = 24;
  const radiusStep = (maxR - baseRadius) / Math.max(1, numPoints - 1);

  for (let k = 0; k < numPoints; k++) {
    const angle  = k * angleStep;
    const radius = baseRadius + k * radiusStep;

    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    points.push({ x, y, active: true });
    drawPoint(x, y);
  }
}

// --- draw neon point ---
function drawPoint(x, y, radius = 6) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = "#cfc2ff";
  ctx.shadowColor = "#8a2be2";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
}

// --- Click handling (with CSS->canvas coordinate mapping) ---
function handleClick(e) {
  // Ako igrač nema potez, prekini i prikaži kraj
  if (!playerHasMove()) {
    showGameOverForCurrentNoMove();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top)  * scaleY;

  const hitRadius = 12;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.active && Math.hypot(p.x - clickX, p.y - clickY) < hitRadius) {
      selected.push({ x: p.x, y: p.y, index: i });

      if (selected.length === 3) {
        if (validTriangle(selected)) {
          const triObj = {
            pts: [{...selected[0]}, {...selected[1]}, {...selected[2]}],
            player: currentPlayer
          };
          drawnTriangles.push(triObj);

          // deactivate vertices
          selected.forEach(s => { points[s.index].active = false; });

          // switch player
          currentPlayer = 1 - currentPlayer;

          // provjeri potez sljedećeg igrača (ujednačeno)
          if (!playerHasMove()) {
            showGameOverForCurrentNoMove();
            canvas.removeEventListener("click", handleClick);
          } else {
            statusText.textContent = `Player ${currentPlayer === 0 ? "A" : "B"}'s turn`;
          }
        } else {
          showPopup("Invalid Move", "That triangle is not allowed. Try again!");
        }
        selected = [];
      }

      redrawAll();
      return; // jedna tačka po kliku
    }
  }
}

// --- Full redraw: points -> selection highlight -> drawn triangles ---
function redrawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // points
  for (const p of points) {
    if (p.active) drawPoint(p.x, p.y, 6);
  }

  // selected highlights
  for (const s of selected) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, 8, 0, 2 * Math.PI);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // triangles (fixed color per owner)
  for (const t of drawnTriangles) {
    paintTriangle(t);
  }
}

// --- Geometry rules ---
function validTriangle(tri) {
  const [A, B, C] = tri;

  // not collinear
  const det = A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y);
  if (det === 0) return false;

  // no shared vertex with existing triangles
  for (const t of drawnTriangles) {
    for (const p1 of tri) {
      for (const p2 of t.pts) {
        if (p1.x === p2.x && p1.y === p2.y) return false;
      }
    }
  }

  // no edge intersections
  for (const t of drawnTriangles) {
    const newEdges = [[A, B], [B, C], [C, A]];
    const oldEdges = [[t.pts[0], t.pts[1]], [t.pts[1], t.pts[2]], [t.pts[2], t.pts[0]]];
    for (const [a1, a2] of newEdges) {
      for (const [b1, b2] of oldEdges) {
        if (segmentsIntersect(a1, a2, b1, b2)) return false;
      }
    }
  }
  return true;
}

// --- Paint a single triangle using its stored player's color ---
function paintTriangle(triObj) {
  const { pts, player } = triObj;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.closePath();

  const stroke = player === 0 ? "#ff1493" : "#28e0ff";        // pink vs cyan
  const fill   = player === 0 ? "rgba(255,20,147,0.25)" : "rgba(40,224,255,0.25)";

  ctx.strokeStyle = stroke;
  ctx.fillStyle   = fill;
  ctx.lineWidth = 2;
  ctx.shadowColor = stroke;
  ctx.shadowBlur = 12;

  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// --- Segment intersection helper ---
function segmentsIntersect(p1, p2, q1, q2) {
  function orientation(a, b, c) {
    const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (val === 0) return 0;
    return val > 0 ? 1 : 2;
  }
  function onSegment(a, b, c) {
    return Math.min(a.x, c.x) <= b.x && b.x <= Math.max(a.x, c.x) &&
           Math.min(a.y, c.y) <= b.y && b.y <= Math.max(a.y, c.y);
  }

  const o1 = orientation(p1, p2, q1);
  const o2 = orientation(p1, p2, q2);
  const o3 = orientation(q1, q2, p1);
  const o4 = orientation(q1, q2, p2);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, q1, p2)) return true;
  if (o2 === 0 && onSegment(p1, q2, p2)) return true;
  if (o3 === 0 && onSegment(q1, p1, q2)) return true;
  if (o4 === 0 && onSegment(q1, p2, q2)) return true;

  return false;
}

// --- Check if any triangle is possible with remaining active points ---
function playerHasMove() {
  const active = points.filter(p => p.active);
  if (active.length < 3) return false;

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      for (let k = j + 1; k < active.length; k++) {
        const tri = [active[i], active[j], active[k]];
        if (validTriangle(tri)) return true;
      }
    }
  }
  return false;
}

// --- Helper: popup Game Over for "no moves" of current player ---
function showGameOverForCurrentNoMove() {
  const loser  = currentPlayer === 0 ? "A" : "B";
  const winner = currentPlayer === 0 ? "B" : "A";
  showPopup(
    "Game Over",
    `Player ${loser} has no more moves.<br><strong>Winner: Player ${winner}!</strong>`
  );
  canvas.removeEventListener("click", handleClick);
}

// === Popup helpers ===
function showPopup(title, text) {
  document.getElementById("popup-title").textContent = title;
  document.getElementById("popup-text").innerHTML = text; // HTML allowed
  document.getElementById("popup").classList.remove("hidden");
}

function hidePopup() {
  document.getElementById("popup").classList.add("hidden");
}
document.getElementById("popup-btn").addEventListener("click", hidePopup);
