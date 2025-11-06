// flyer.js (FINAL for header+brand-logo behavior)
import QRCode from "https://cdn.skypack.dev/qrcode";

const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

// === Top header (HTML <img id="pageLogo">) filenames ===
const PAGE_LOGO_DEFAULT = "eventflyerbuilder-header.png";     // <-- your exact filename
const PAGE_LOGO_DONE    = "eventflyerbuilder-done.png";     // <-- your exact filename
const pageLogoEl = document.getElementById("pageLogo");

// Force the header to the known default on load
if (pageLogoEl) pageLogoEl.src = PAGE_LOGO_DEFAULT;

// === In-canvas Sparklight logo ===
let brandLogo = new Image();
brandLogo.src = "sparklight-logo.png";
brandLogo.onerror = () => { brandLogo = null; };

// --- App state ---
const BRAND_COLOR = "#8d3b91";
const FONT_STACK = `"Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

const state = {
  orientation: document.querySelector('input[name="orientation"]:checked')?.value || "landscape",
  eventName: "",
  contestDetails: "",
  url: "https://www.sparklight.com/internet",
  whiteText: false,
  textColor: BRAND_COLOR,
  effectOutline: false,
  effectShadow: false,
  effectBox: false,
  image: null
};

// --- Helpers ---
function wrapText(ctx, text, maxWidth) {
  const words = (text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth) {
      if (line) lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function contrastColor(hex) {
  const c = (hex || "#000").replace("#","").padStart(6,"0");
  const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  const L = 0.2126*r + 0.7152*g + 0.0722*b;
  return L > 160 ? "#000" : "#fff";
}
function pathRoundRect(x, y, w, h, r=10) {
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.lineTo(x+w-rr, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+rr);
  ctx.lineTo(x+w, y+h-rr);
  ctx.quadraticCurveTo(x+w, y+h, x+w-rr, y+h);
  ctx.lineTo(x+rr, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-rr);
  ctx.lineTo(x, y+rr);
  ctx.quadraticCurveTo(x, y, x+rr, y);
  ctx.closePath();
}
function updateState() {
  state.orientation = document.querySelector('input[name="orientation"]:checked').value;
  state.eventName = document.getElementById("eventName").value.trim();
  state.contestDetails = document.getElementById("contestDetails").value.trim();
  state.url = document.getElementById("url").value.trim();
  state.whiteText = document.getElementById("whiteTextToggle").checked;
  state.textColor = document.getElementById("textColorSelect").value;
  state.effectOutline = document.getElementById("effectOutline").checked;
  state.effectShadow = document.getElementById("effectShadow").checked;
  state.effectBox = document.getElementById("effectBox").checked;
}

// --- Listeners (also flip the TOP header to "done") ---
document.querySelectorAll("input, textarea, select").forEach(el => {
  el.addEventListener("input", () => {
    updateState();
    if (pageLogoEl && pageLogoEl.src.indexOf(PAGE_LOGO_DONE) === -1) {
      pageLogoEl.src = PAGE_LOGO_DONE;
    }
    drawFlyer();
  });
});

document.getElementById("imageUpload").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = () => { state.image = img; if (pageLogoEl) pageLogoEl.src = PAGE_LOGO_DONE; drawFlyer(); };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("flyerForm").reset();
  // reset state
  state.image = null;
  state.eventName = "";
  state.contestDetails = "";
  state.url = "https://www.sparklight.com/internet";
  state.whiteText = false;
  state.textColor = BRAND_COLOR;
  state.effectOutline = false;
  state.effectShadow = false;
  state.effectBox = false;
  // reset TOP header back to default art
  if (pageLogoEl) pageLogoEl.src = PAGE_LOGO_DEFAULT;
  drawFlyer();
});

document.getElementById("saveBtn").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const fmt = document.getElementById("downloadFormat").value;
  const name = "Flyer";
  if (fmt === "jpg") {
    const a = document.createElement("a");
    a.download = `${name}.jpg`;
    a.href = canvas.toDataURL("image/jpeg", 0.92);
    a.click();
  } else {
    const W = canvas.width, H = canvas.height;
    const pdf = new jsPDF({ orientation: W > H ? "l" : "p", unit: "pt", format: [W, H] });
    pdf.addImage(canvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, W, H);
    pdf.save(`${name}.pdf`);
  }
});

// --- Draw ---
async function drawFlyer() {
  const W = state.orientation === "portrait" ? 850 : 1100;
  const H = state.orientation === "portrait" ? 1100 : 850;
  canvas.width = W; canvas.height = H;

  // base
  ctx.fillStyle = "#fff"; ctx.fillRect(0,0,W,H);

  // bg image cover + fade
  if (state.image) {
    const img = state.image, arI = img.width/img.height, arC = W/H;
    let dw, dh, ox, oy;
    if (arI > arC) { dh = H; dw = dh * arI; ox = (W-dw)/2; oy = 0; }
    else { dw = W; dh = dw / arI; ox = 0; oy = (H-dh)/2; }
    ctx.globalAlpha = 0.7; ctx.drawImage(img, ox, oy, dw, dh); ctx.globalAlpha = 1;
    const gradH = H*0.4, g = ctx.createLinearGradient(0,0,0,gradH);
    g.addColorStop(0,"rgba(255,255,255,1)"); g.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,gradH);
  }

  // ==== IN-CANVAS SPARKLIGHT LOGO (pink) ====
  if (brandLogo && brandLogo.complete && brandLogo.naturalWidth > 0) {
    const logoW = Math.max(W * 0.20, 140);                 // scale about 20% of canvas width
    const logoH = logoW / (brandLogo.width / brandLogo.height);
    const logoY = 10;                                      // ✅ 10px padding from top
    ctx.drawImage(brandLogo, (W - logoW)/2, logoY, logoW, logoH);
  }

  // Title (auto-fit up to 2 lines)
  const qrSize = W * 0.25, qrPad = qrSize*0.10, labelSize = qrSize*0.08;
  const maxTextWidth = qrSize * 2.5;
  let fontSize = qrSize * 0.26;
  ctx.font = `900 ${fontSize}px ${FONT_STACK}`;

  let lines = wrapText(ctx, state.contestDetails, maxTextWidth);
  const MIN = 20;
  while (lines.length > 2 && fontSize > MIN) {
    fontSize -= 2; ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
    lines = wrapText(ctx, state.contestDetails, maxTextWidth);
  }

  const lineSpacing = fontSize * 1.1;
  const textBlockH = lines.length * lineSpacing;
  const contentTopY = H/2 - (textBlockH + qrSize + labelSize + qrPad*2 + 40)/2;

  // optional background box
  if (state.effectBox && lines.length) {
    const padX = 20, padY = 10, boxW = maxTextWidth + padX*2, boxH = textBlockH + padY*2;
    const boxX = (W - boxW)/2, boxY = contentTopY - padY;
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.strokeStyle = "rgba(0,0,0,0.15)";
    pathRoundRect(boxX, boxY, boxW, boxH, 10); ctx.fill(); ctx.stroke();
  }

  // title text with effects
  const fill = state.whiteText ? "#fff" : state.textColor;
  const outline = contrastColor(fill);
  ctx.textAlign = "center"; ctx.textBaseline = "top";

  lines.forEach((line, i) => {
    const y = contentTopY + i * lineSpacing;
    if (state.effectShadow) {
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    } else { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
    if (state.effectOutline) { ctx.lineWidth = 4; ctx.strokeStyle = outline; ctx.strokeText(line, W/2, y); }
    ctx.fillStyle = fill; ctx.fillText(line, W/2, y);
  });

  // QR card under text
  const qrTop = contentTopY + textBlockH + 40;
  const cardX = (W - (qrSize + qrPad*2))/2, cardY = qrTop;
  const cardH = qrSize + qrPad*2 + labelSize*1.2;
  ctx.fillStyle = "#fff"; pathRoundRect(cardX, cardY, qrSize + qrPad*2, cardH, 8); ctx.fill();

  const qrDataURL = await QRCode.toDataURL(state.url, {
    width: Math.round(qrSize), margin: 0, color: { dark: "#000", light: "#fff" }
  });
  const qrImg = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = qrDataURL; });
  ctx.drawImage(qrImg, cardX + qrPad, cardY + qrPad, qrSize, qrSize);

  ctx.font = `bold ${labelSize}px ${FONT_STACK}`; ctx.fillStyle = "#000";
  ctx.fillText("Scan to Enter", W/2, cardY + qrPad + qrSize + 10);
}

// --- init ---
updateState();
drawFlyer();
