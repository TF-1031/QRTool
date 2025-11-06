// flyer.js (FINAL COMPLETE WITH HEADER SWAP)
import QRCode from "https://cdn.skypack.dev/qrcode";

const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

// ---------------- CONSTANTS ----------------
const BRAND_COLOR = "#8d3b91";
const FONT_STACK = `"Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

// Header logo assets and handle
const headerLogos = {
  default: "eventflyerbuilder-logo.png",
  done: "eventflyerbuilder-done-logo.png",
};
let headerLogoImage = new Image();
headerLogoImage.src = headerLogos.default;

// ---------------- STATE ----------------
const state = {
  orientation: document.querySelector('input[name="orientation"]:checked')?.value || "landscape",
  eventName: "",
  contestDetails: "",
  url: "https://www.sparklight.com/internet",

  // text styling
  whiteText: false,
  textColor: BRAND_COLOR,
  effectOutline: false,
  effectShadow: false,
  effectBox: false,

  // assets
  image: null,
  logo: null,
};

// ---------------- HELPERS ----------------
function mlaTitleCase(input) {
  if (!input) return "";
  const small = new Set(["a","an","and","as","at","but","by","for","in","nor","of","on","or","so","the","to","up","yet","with"]);
  const words = input.split(/\s+/);
  return words.map((w,i)=>{
    if (w === w.toUpperCase()) return w;
    const lower = w.toLowerCase();
    const firstOrLast = i===0 || i===words.length-1;
    return small.has(lower) && !firstOrLast ? lower : lower.charAt(0).toUpperCase()+lower.slice(1);
  }).join(" ");
}

function sanitizeFilename(name) {
  return (name || "flyer").trim().replace(/[^a-zA-Z0-9 _-]/g,"").replace(/\s+/g,"_");
}

function wrapText(ctx, text, maxWidth) {
  const words = (text || "").trim().split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// simple luminance for contrast (returns #000 or #fff)
function contrastColor(hex) {
  const c = (hex || "#000").replace("#","").padStart(6,"0");
  const r = parseInt(c.slice(0,2),16);
  const g = parseInt(c.slice(2,4),16);
  const b = parseInt(c.slice(4,6),16);
  const L = 0.2126*r + 0.7152*g + 0.0722*b; // 0..255
  return L > 160 ? "#000000" : "#ffffff";
}

// draw a rounded rect path (fallback if CanvasRenderingContext2D.roundRect is missing)
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
  state.contestDetails = mlaTitleCase(document.getElementById("contestDetails").value.trim());
  state.url = document.getElementById("url").value.trim();
  state.whiteText = document.getElementById("whiteTextToggle").checked;

  const colorSel = document.getElementById("textColorSelect");
  if (colorSel) state.textColor = colorSel.value || BRAND_COLOR;

  const eo = document.getElementById("effectOutline");
  const es = document.getElementById("effectShadow");
  const eb = document.getElementById("effectBox");
  if (eo) state.effectOutline = eo.checked;
  if (es) state.effectShadow = es.checked;
  if (eb) state.effectBox = eb.checked;
}

// ---------------- EVENTS ----------------
document.querySelectorAll("input, textarea, select").forEach(el => {
  el.addEventListener("input", async () => {
    updateState();
    // Switch header to "done" on any change
    headerLogoImage.src = headerLogos.done;
    await drawFlyer();
  });
});

document.getElementById("imageUpload").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = async () => {
      state.image = img;
      // mark as done state after adding image
      headerLogoImage.src = headerLogos.done;
      await drawFlyer();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("flyerForm").reset();

  // Reset state to defaults
  state.eventName = "";
  state.contestDetails = "";
  state.url = "https://www.sparklight.com/internet";
  state.image = null;
  state.whiteText = false;
  state.textColor = BRAND_COLOR;
  state.effectOutline = false;
  state.effectShadow = false;
  state.effectBox = false;

  // Reset header logo to default
  headerLogoImage.src = headerLogos.default;

  drawFlyer();
});

document.getElementById("saveBtn").addEventListener("click", async () => {
  const format = document.getElementById("downloadFormat").value;
  const base = sanitizeFilename(state.eventName || "flyer");

  if (format === "jpg") {
    const a = document.createElement("a");
    a.download = `${base}.jpg`;
    a.href = canvas.toDataURL("image/jpeg", 0.92);
    a.click();
  } else {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: state.orientation === "portrait" ? "p" : "l",
      unit: "pt",
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(canvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${base}.pdf`);
  }
});

// ---------------- DRAW ----------------
async function drawFlyer() {
  const W = state.orientation === "portrait" ? 850 : 1100;
  const H = state.orientation === "portrait" ? 1100 : 850;

  canvas.width = W;
  canvas.height = H;

  // background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,W,H);

  // background image (cover) + top fade
  if (state.image) {
    const img = state.image;
    const imgAspect = img.width / img.height;
    const canvasAspect = W / H;
    let drawW, drawH, offX, offY;

    if (imgAspect > canvasAspect) {
      drawH = H; drawW = drawH * imgAspect; offX = (W - drawW)/2; offY = 0;
    } else {
      drawW = W; drawH = drawW / imgAspect; offX = 0; offY = (H - drawH)/2;
    }

    ctx.globalAlpha = 0.7;
    ctx.drawImage(img, offX, offY, drawW, drawH);
    ctx.globalAlpha = 1;

    const gradH = H * 0.4;
    const grad = ctx.createLinearGradient(0,0,0,gradH);
    grad.addColorStop(0,"rgba(255,255,255,1)");
    grad.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,gradH);
  }

  // top header logo (centered)
  if (headerLogoImage) {
    const lw = Math.max(W * 0.20, 40);
    const aspect = (headerLogoImage.width || 400) / (headerLogoImage.height || 100);
    const lh = lw / aspect;
    ctx.drawImage(headerLogoImage, (W - lw)/2, 20, lw, lh);
  }

  // Sparklight logo mark (if provided)
  if (state.logo) {
    const lw = Math.max(W*0.2, 40);
    const lh = lw / (state.logo.width / state.logo.height);
    // If you want the brand mark too, uncomment next line:
    // ctx.drawImage(state.logo, (W - lw)/2, 20, lw, lh);
  }

  // layout metrics
  const qrSize = W * 0.25;
  const qrPadding = qrSize * 0.10;
  const labelFontSize = qrSize * 0.08;
  let fontSize = qrSize * 0.26;
  const maxTextWidth = qrSize * 2.5;

  // auto-fit contest text to max 2 lines
  ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
  let lines = wrapText(ctx, state.contestDetails, maxTextWidth);
  const MIN_FONT = 20;

  while (lines.length > 2 && fontSize > MIN_FONT) {
    fontSize -= 2;
    ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
    lines = wrapText(ctx, state.contestDetails, maxTextWidth);
  }

  const lineSpacing = fontSize * 1.1;
  const textBlockHeight = lines.length * lineSpacing;
  const contentTopY = H/2 - (textBlockHeight + qrSize + labelFontSize + qrPadding*2 + 40)/2;
  const textX = W/2;

  // optional background box behind text
  if (state.effectBox && lines.length) {
    const padX = 20, padY = 10;
    const boxW = maxTextWidth + padX*2;
    const boxH = textBlockHeight + padY*2;
    const boxX = textX - boxW/2;
    const boxY = contentTopY - padY;

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    pathRoundRect(boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();
  }

  // text effects (outline/shadow)
  const fillColor = state.whiteText ? "#ffffff" : state.textColor;
  const outlineColor = contrastColor(fillColor);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  lines.forEach((line, i) => {
    const y = contentTopY + i * lineSpacing;

    if (state.effectShadow) {
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    if (state.effectOutline) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = outlineColor;
      ctx.strokeText(line, textX, y);
    }

    ctx.fillStyle = fillColor;
    ctx.fillText(line, textX, y);
  });

  // reset shadow for rest of drawing
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // QR card
  const qrBoxTop = contentTopY + textBlockHeight + 40;
  const boxX = (W - (qrSize + qrPadding*2)) / 2;
  const boxY = qrBoxTop;
  const qrCardH = qrSize + qrPadding*2 + labelFontSize*1.2;

  ctx.fillStyle = "#ffffff";
  pathRoundRect(boxX, boxY, qrSize + qrPadding*2, qrCardH, 8);
  ctx.fill();

  const qrDataURL = await QRCode.toDataURL(state.url, {
    width: Math.round(qrSize),
    margin: 0,
    color: { dark: "#000000", light: "#ffffff" }
  });

  const qrImg = await new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.src = qrDataURL;
  });

  ctx.drawImage(qrImg, boxX + qrPadding, boxY + qrPadding, qrSize, qrSize);

  // label
  ctx.font = `bold ${labelFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = "#000000";
  ctx.fillText("Scan to Enter", W/2, boxY + qrPadding + qrSize + 10);
}

// ---------------- LOAD SPARKLIGHT LOGO (if you want the brand mark in-canvas) ----------------
const logoImage = new Image();
logoImage.onload = () => { state.logo = logoImage; drawFlyer(); };
// If you don't want an additional logo in the canvas, you can comment the next line:
logoImage.src = "sparklight-logo.png";

// ---------------- PRELOAD HEADER LOGOS, THEN INIT ----------------
const preloadDefault = new Promise(res => { const img = new Image(); img.onload = res; img.src = headerLogos.default; });
const preloadDone = new Promise(res => { const img = new Image(); img.onload = res; img.src = headerLogos.done; });

Promise.all([preloadDefault, preloadDone]).then(() => {
  headerLogoImage.src = headerLogos.default;
  updateState();
  drawFlyer();
});
