const canvas = document.getElementById("tabla");
const ctx = canvas.getContext("2d");
const status = document.getElementById("status");

let tacke = [];
let selektovane = [];
let igracNaPotezu = 0;
let iscrtaniTrouglovi = [];

function novaIgra() {
  tacke = [];
  selektovane = [];
  iscrtaniTrouglovi = [];
  igracNaPotezu = 0;

  // Preuzmi selekciju sa stranice
  let selekcija = document.getElementById("velicinaTable").value;

  if (selekcija === "4x6") {
    m = 4; n = 6;
  } else if (selekcija === "6x8") {
    m = 6; n = 8;
  } else if (selekcija === "8x10") {
    m = 8; n = 10;
  } else if (selekcija === "custom") {
    m = 0; n = 0; // nepravilna mreža
  }

  status.textContent = "Igrač A je na potezu";
  crtajMrezu();
}


function crtajMrezu() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let dx = canvas.width / (n + 1);
  let dy = canvas.height / (m + 1);
  tacke = [];

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      let x = j * dx;
      let y = i * dy;
      tacke.push({ x, y, aktivna: true });
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "black";
      ctx.fill();
    }
  }
}

canvas.addEventListener("click", obradiKlik);

function obradiKlik(e) {
  let rect = canvas.getBoundingClientRect();
  let klikX = e.clientX - rect.left;
  let klikY = e.clientY - rect.top;

  tacke.forEach((t, i) => {
    if (t.aktivna && Math.hypot(t.x - klikX, t.y - klikY) < 10) {
      selektovane.push({ x: t.x, y: t.y, index: i });

      ctx.beginPath();
      ctx.arc(t.x, t.y, 7, 0, 2 * Math.PI);
      ctx.strokeStyle = "red";
      ctx.stroke();

      if (selektovane.length === 3) {
        if (validanTrougao(selektovane)) {
          iscrtajTrougao(selektovane);
          selektovane.forEach(s => tacke[s.index].aktivna = false);

          igracNaPotezu = 1 - igracNaPotezu;

          if (!igracImaPotez()) {
            status.textContent = `Igrač ${igracNaPotezu === 0 ? "A" : "B"} nema više poteza. KRAJ IGRE!`;
            canvas.removeEventListener("click", obradiKlik);
          } else {
            status.textContent = `Igrač ${igracNaPotezu === 0 ? "A" : "B"} je na potezu`;
          }
        } else {
          alert("Nepravilan potez!");
        }

        selektovane = [];
      }
    }
  });
}


function validanTrougao(tri) {
  let [A, B, C] = tri;

  // Provjera da nisu na istoj pravoj (determinanta != 0)
  let det = A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y);
  if (det === 0) return false;

  // Provjera da ne dijele vrh s prethodnim trouglovima
  for (let t of iscrtaniTrouglovi) {
    for (let p1 of tri) {
      for (let p2 of t) {
        if (p1.x === p2.x && p1.y === p2.y) return false;
      }
    }
  }

    // Provjera da se trougao ne siječe s drugim
  for (let t of iscrtaniTrouglovi) {
    let straniceNove = [[A, B], [B, C], [C, A]];
    let stranicePostojece = [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]];

    for (let [a1, a2] of straniceNove) {
      for (let [b1, b2] of stranicePostojece) {
        if (segmentiSeSijeku(a1, a2, b1, b2)) return false;
      }
    }
  }


  return true;
}

function iscrtajTrougao(tri) {
  ctx.beginPath();
  ctx.moveTo(tri[0].x, tri[0].y);
  ctx.lineTo(tri[1].x, tri[1].y);
  ctx.lineTo(tri[2].x, tri[2].y);
  ctx.closePath();
  ctx.strokeStyle = igracNaPotezu === 0 ? "blue" : "green"; // Linija u boji igrača
  ctx.lineWidth = 2;
  ctx.stroke();
  iscrtaniTrouglovi.push(tri);
}


function segmentiSeSijeku(p1, p2, q1, q2) {
  function orijentacija(a, b, c) {
    let val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (val === 0) return 0;
    return val > 0 ? 1 : 2;
  }

  function naSegmentu(a, b, c) {
    return Math.min(a.x, c.x) <= b.x && b.x <= Math.max(a.x, c.x) &&
           Math.min(a.y, c.y) <= b.y && b.y <= Math.max(a.y, c.y);
  }

  let o1 = orijentacija(p1, p2, q1);
  let o2 = orijentacija(p1, p2, q2);
  let o3 = orijentacija(q1, q2, p1);
  let o4 = orijentacija(q1, q2, p2);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && naSegmentu(p1, q1, p2)) return true;
  if (o2 === 0 && naSegmentu(p1, q2, p2)) return true;
  if (o3 === 0 && naSegmentu(q1, p1, q2)) return true;
  if (o4 === 0 && naSegmentu(q1, p2, q2)) return true;

  return false;
}

function igracImaPotez() {
  let aktivne = tacke.filter(t => t.aktivna);
  for (let i = 0; i < aktivne.length; i++) {
    for (let j = i + 1; j < aktivne.length; j++) {
      for (let k = j + 1; k < aktivne.length; k++) {
        let tri = [aktivne[i], aktivne[j], aktivne[k]];
        if (validanTrougao(tri)) return true;
      }
    }
  }
  return false;
}
