const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

let pts = [];
let sel = [];
let cur = 0;         
let startCur = 0;     
let tris = [];        
let m = 0, n = 0;

let moves = 0;
let dyn = false;

// za dynamic
let nextAt = null;
const stepMin = 2, stepMax = 5;
const rmMin = 1, rmMax = 3;

function setBorder() {
  if (cur === 0) {
    canvas.style.borderColor = "#ff1493";
    canvas.style.boxShadow = "0 0 20px rgba(255,20,147,0.6)";
  } else {
    canvas.style.borderColor = "#28e0ff";
    canvas.style.boxShadow = "0 0 20px rgba(40,224,255,0.6)";
  }
}

function newGame() {
  startCur = 0;
  startRound(startCur);
}

function startRound(starter) {
  pts = [];
  sel = [];
  tris = [];
  cur = starter;
  moves = 0;
  nextAt = null;

  canvas.removeEventListener("click", onClick);
  canvas.addEventListener("click", onClick);

  const choice = document.getElementById("boardSize").value;
  dyn = (choice === "dynamic");

  if (choice === "4x6") {
    m = 4; n = 6; makeMatrix(m, n);
  } else if (choice === "6x8") {
    m = 6; n = 8; makeMatrix(m, n);
  } else if (choice === "8x10") {
    m = 8; n = 10; makeMatrix(m, n);
  } else if (choice === "dynamic") {
    m = 6; n = 8; makeMatrix(m, n);
  } else {
    makeSpiral();
  }

  setBorder();
  drawAll();

  if (dyn) {
    planNext();
  }
  if (!hasMove()) {
    gameOverNow();
  }
}

function makeMatrix(r, c) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pts = [];
  const dx = canvas.width / (c + 1);
  const dy = canvas.height / (r + 1);

  for (let i = 1; i <= r; i++) {
    for (let j = 1; j <= c; j++) {
      const x = j * dx;
      const y = i * dy;
      const point = { x: x, y: y, active: true };
      pts.push(point);
      drawPoint(x, y);
    }
  }
}

function makeSpiral() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pts = [];

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const margin = 36;
  const maxR = Math.min(canvas.width, canvas.height) / 2 - margin;

  const num = 70;
  const angStep = 0.5;
  const baseR = 24;
  const rStep = (maxR - baseR) / Math.max(1, num - 1);

  for (let k = 0; k < num; k++) {
    const a = k * angStep;
    const r = baseR + k * rStep;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);

    const point = { x: x, y: y, active: true };
    pts.push(point);
    drawPoint(x, y);
  }
}

function drawPoint(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#cfc2ff";
  ctx.shadowColor = "#8a2be2";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawTri(t) {
  const p = t.pts;
  const owner = t.player;

  let stroke;
  let fill;
  if (owner === 0) {
    stroke = "#ff1493";
    fill = "rgba(255,20,147,0.25)";
  } else {
    stroke = "#28e0ff";
    fill = "rgba(40,224,255,0.25)";
  }

  ctx.beginPath();
  ctx.moveTo(p[0].x, p[0].y);
  ctx.lineTo(p[1].x, p[1].y);
  ctx.lineTo(p[2].x, p[2].y);
  ctx.closePath();

  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = 2;
  ctx.shadowColor = stroke;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < pts.length; i++) {
    if (pts[i].active) {
      drawPoint(pts[i].x, pts[i].y);
    }
  }

  for (let s = 0; s < sel.length; s++) {
    ctx.beginPath();
    ctx.arc(sel[s].x, sel[s].y, 8, 0, Math.PI * 2);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (let t = 0; t < tris.length; t++) {
    drawTri(tris[t]);
  }
}

function onClick(e) {
  if (!hasMove()) {
    gameOverNow();
    return;
  }

  const r = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width;
  const sy = canvas.height / r.height;
  const x = (e.clientX - r.left) * sx;
  const y = (e.clientY - r.top) * sy;

  const hit = 12;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dist = Math.hypot(p.x - x, p.y - y);

    if (p.active && dist < hit) {
      const chosen = { x: p.x, y: p.y, i: i };
      sel.push(chosen);

      if (sel.length === 3) {
        const ok = isValid(sel);
        if (ok) {
          const triObj = {
            pts: [
              { x: sel[0].x, y: sel[0].y },
              { x: sel[1].x, y: sel[1].y },
              { x: sel[2].x, y: sel[2].y }
            ],
            player: cur
          };
          tris.push(triObj);

          for (let k = 0; k < 3; k++) {
            const index = sel[k].i;
            pts[index].active = false;
          }

          if (cur === 0) {
            cur = 1;
          } else {
            cur = 0;
          }

          moves = moves + 1;

          if (dyn) {
            maybeDisappear();
          }

          setBorder();

          const canPlay = hasMove();
          if (!canPlay) {
            gameOverNow();
            canvas.removeEventListener("click", onClick);
          }
        } else {
          showPopup("Invalid Move", "That triangle is not allowed. Try again!");
        }

        sel = [];
      }

      drawAll();
      return;
    }
  }
}

//provjera
function isValid(tri) {
  const A = tri[0];
  const B = tri[1];
  const C = tri[2];

  const det = A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y);
  if (det === 0) {
    return false;
  }

  for (let t = 0; t < tris.length; t++) {
    const T = tris[t].pts;
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        if (tri[a].x === T[b].x && tri[a].y === T[b].y) {
          return false;
        }
      }
    }
  }

  for (let u = 0; u < tris.length; u++) {
    const E = tris[u].pts;
    const newE = [[A, B], [B, C], [C, A]];
    const oldE = [[E[0], E[1]], [E[1], E[2]], [E[2], E[0]]];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const a1 = newE[i][0];
        const a2 = newE[i][1];
        const b1 = oldE[j][0];
        const b2 = oldE[j][1];

        const hit = intersect(a1, a2, b1, b2);
        if (hit) {
          return false;
        }
      }
    }
  }

  return true;
}

function intersect(p1, p2, q1, q2) {
  function ori(a, b, c) {
    const v = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (v === 0) {
      return 0;
    } else if (v > 0) {
      return 1;
    } else {
      return 2;
    }
  }

  function onSeg(a, b, c) {
    const withinX = Math.min(a.x, c.x) <= b.x && b.x <= Math.max(a.x, c.x);
    const withinY = Math.min(a.y, c.y) <= b.y && b.y <= Math.max(a.y, c.y);
    if (withinX && withinY) {
      return true;
    } else {
      return false;
    }
  }

  const o1 = ori(p1, p2, q1);
  const o2 = ori(p1, p2, q2);
  const o3 = ori(q1, q2, p1);
  const o4 = ori(q1, q2, p2);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }
  if (o1 === 0 && onSeg(p1, q1, p2)) {
    return true;
  }
  if (o2 === 0 && onSeg(p1, q2, p2)) {
    return true;
  }
  if (o3 === 0 && onSeg(q1, p1, q2)) {
    return true;
  }
  if (o4 === 0 && onSeg(q1, p2, q2)) {
    return true;
  }

  return false;
}

function hasMove() {
  const act = [];
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].active) {
      act.push(pts[i]);
    }
  }

  if (act.length < 3) {
    return false;
  }

  for (let a = 0; a < act.length; a++) {
    for (let b = a + 1; b < act.length; b++) {
      for (let c = b + 1; c < act.length; c++) {
        const ok = isValid([act[a], act[b], act[c]]);
        if (ok) {
          return true;
        }
      }
    }
  }

  return false;
}


function planNext() {
  const step = rand(stepMin, stepMax);
  nextAt = moves + step;
}

function maybeDisappear() {
  if (!dyn) {
    return;
  }
  if (nextAt == null) {
    planNext();
  }
  if (moves < nextAt) {
    return;
  }

  const k = rand(rmMin, rmMax);
  removeActive(k);
  planNext();
}

function removeActive(k) {
  const idxs = [];
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].active) {
      idxs.push(i);
    }
  }

  if (idxs.length === 0) {
    return;
  }

  shuffle(idxs);

  const maxTake = Math.min(k, idxs.length);
  for (let t = 0; t < maxTake; t++) {
    const idx = idxs[t];
    pts[idx].active = false;
  }
}

function rand(min, max) {
  const r = Math.random();
  const value = Math.floor(r * (max - min + 1)) + min;
  return value;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function gameOverNow() {
  let loser;
  let winner;
  if (cur === 0) {
    loser = "A";
    winner = "B";
  } else {
    loser = "B";
    winner = "A";
  }

  const msg = "Player " + loser + " has no more moves.<br><b>Winner: Player " + winner + "!</b><br>";
  showPopup("Game Over", msg);
  canvas.removeEventListener("click", onClick);
}

function showPopup(title, html) {
  document.getElementById("popup-title").textContent = title;
  document.getElementById("popup-text").innerHTML = html;
  document.getElementById("popup").classList.remove("hidden");
}

function hidePopup() {
  document.getElementById("popup").classList.add("hidden");
}

document.getElementById("popup-btn").addEventListener("click", hidePopup);

const again = document.getElementById("popup-play-again");
if (again) {
  again.addEventListener("click", function () {
    hidePopup();
    if (startCur === 0) {
      startCur = 1;
    } else {
      startCur = 0;
    }
    startRound(startCur);
  });
}
