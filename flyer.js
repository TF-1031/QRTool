// flyer.js
import QRCode from "https://cdn.skypack.dev/qrcode";

const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

// ---------------- STATE ----------------
const state = {
  orientation: document.querySelector('input[name="orientation"]:checked')?.value || "landscape",
  eventName: "",
  contestDetails: "",
  url: "https://www.sparklight.com/internet",
  whiteText: false,
  image: null,
  logo: null,
};

const FONT_STACK = `"Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
const BRAND_COLOR = "#8d3b91";


// ---------------- HELPERS ----------------
function mlaTitleCase(input) {
  if (!input) return "";
  const small = new Set([
    "a","an","and","as","at","but","by","for","in","nor","of","on","or","so","the","to","up","yet","with"
  ]);

  return input.split(/\s+/).map((w,i)=>{
    if (w === w.toUpperCase()) return w;
    const lower = w.toLowerCase();
    const isFirstOrLast = i===0 || i===input.split(/\s+/).length-1;
    return small.has(lower) && !isFirstOrLast
      ? lower
      : lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

function sanitizeFilename(name) {
  return (name || "flyer").trim().replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_");
}

function wrapText(ctx, text, maxWidth) {
  const words = (text || "").split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const test = line ? line + " " + word : word;
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

function updateState() {
  state.orientation = document.querySelector('input[name="orientation"]:checked').value;
  state.eventName = document.getElementById("eventName").value.trim();
  state.contestDetails = mlaTitleCase(
    document.getElementById("contestDetails").value.trim()
  );
  state.url = document.getElementById("url").value.trim();
  state.whiteText = document.getElementById("whiteTextToggle").checked;
}


// ---------------- INPUT LISTENERS ----------------
document.querySelectorAll("input, textarea, select").forEach(el => {
  el.addEventListener("input", async () => {
    updateState();
    await drawFlyer();
  });
});

document.getElementById("imageUpload").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = async () => {
      state.image = img;
      await drawFlyer();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("flyerForm").reset();
  state.eventName = "";
  state.contestDetails = "";
  state.url = "https://www.sparklight.com/internet";
  state.image = null;
  state.whiteText = false;
  drawFlyer();
});

document.getElementById("saveBtn").addEventListener("click", async () => {
  const format = document.getElementById("downloadFormat").value;
  const base = sanitizeFilename(state.eventName || "flyer");

  if (format === "jpg") {
    const link = document.createElement("a");
    link.download = `${base}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.click();
  } else {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: state.orientation === "portrait" ? "p" : "l",
      unit: "pt",
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(canvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${base}.pdf`);
  }
});


// ---------------- DRAWING SYSTEM ----------------
async function drawFlyer() {
  const W = state.orientation === "portrait" ? 850 : 1100;
  const H = state.orientation === "portrait" ? 1100 : 850;

  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Background image
  if (state.image) {
    const img = state.image;
    const imgRatio = img.width / img.height;
    const canvasRatio = W / H;
    let drawW, drawH, offsetX, offsetY;

    if (imgRatio > canvasRatio) {
      drawH = H;
      drawW = drawH * imgRatio;
      offsetX = (W - drawW) / 2;
      offsetY = 0;
    } else {
      drawW = W;
      drawH = drawW / imgRatio;
      offsetX = 0;
      offsetY = (H - drawH) / 2;
    }

    ctx.globalAlpha = 0.7;
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    ctx.globalAlpha = 1;

    // gradient fade top
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.4);
  }


  // Logo
  if (state.logo) {
    const logoW = Math.max(W * 0.2, 40);
    const logoH = logoW / (state.logo.width / state.logo.height);
    ctx.drawImage(state.logo, (W - logoW) / 2, 20, logoW, logoH);
  }


  // ---------------- AUTO-FIT TITLE (max 2 lines) ----------------
  const qrSize = W * 0.25;
  const qrPadding = qrSize * 0.10;
  const labelFontSize = qrSize * 0.08;

  let fontSize = qrSize * 0.26;
  const maxTextWidth = qrSize * 2.5;
  const MIN_FONT = 20;

  ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
  let lines = wrapText(ctx, state.contestDetails, maxTextWidth);

  while (lines.length > 2 && fontSize > MIN_FONT) {
    fontSize -= 2;
    ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
    lines = wrapText(ctx, state.contestDetails, maxTextWidth);
  }

  const lineSpacing = fontSize * 1.1;
  const textBlockHeight = lines.length * lineSpacing;

  const contentTopY = H / 2 - (
    textBlockHeight +
    qrSize +
    labelFontSize +
    qrPadding * 2 +
    40
  ) / 2;

onst textX = W / 2;

// TEXT BACKGROUND BOX
if (state.effectBox) {
  const paddingX = 20;
  const paddingY = 10;

  const boxWidth = maxTextWidth + paddingX * 2;
  const boxHeight = textBlockHeight + paddingY * 2;

  ctx.fillStyle = "#ffffffaa"; // semi-white
  ctx.strokeStyle = "#00000022";

  ctx.roundRect(
    textX - boxWidth / 2,
    contentTopY - paddingY,
    boxWidth,
    boxHeight,
    10
  );
  ctx.fill();
}

// TEXT EFFECTS
lines.forEach((line, i) => {
  const y = contentTopY + i * lineSpacing;

  // Outline
  if (state.effectOutline) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#000000";
    ctx.strokeText(line, textX, y);
  }

  // Shadow
  if (state.effectShadow) {
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  } else {
    ctx.shadowColor = "transparent";
  }

  // Actual fill text
  ctx.fillStyle = state.textColor;
  ctx.fillText(line, textX, y);
});

// Reset shadows for rest of drawing
ctx.shadowColor = "transparent";


  // ---------------- QR CODE ----------------
  const qrBoxTop = contentTopY + textBlockHeight + 40;
  const boxX = (W - (qrSize + qrPadding * 2)) / 2;
  const boxY = qrBoxTop;

  const qrData = await QRCode.toDataURL(state.url, {
    width: Math.round(qrSize),
    margin: 0,
    color: { dark: "#000000", light: "#ffffff" }
  });

  const qrImg = await new Promise(resolve => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.src = qrData;
  });

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(boxX, boxY, qrSize + qrPadding * 2, qrSize + qrPadding * 2 + labelFontSize * 1.2);
  ctx.drawImage(qrImg, boxX + qrPadding, boxY + qrPadding, qrSize, qrSize);

  // QR Label
  ctx.font = `bold ${labelFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = "#000000";
  ctx.fillText("Scan to Enter", W / 2, boxY + qrPadding + qrSize + 10);
}


// ---------------- LOAD LOGO ----------------
const logoImage = new Image();
logoImage.onload = () => {
  state.logo = logoImage;
  drawFlyer();
};
logoImage.src = "sparklight-logo.png";

updateState();
drawFlyer();

