// flyer.js
import QRCode from "https://cdn.skypack.dev/qrcode";

const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

const state = {
  orientation: document.querySelector('input[name="orientation"]:checked')?.value || "landscape",
  eventName: "",
  contestDetails: "",
  url: "https://www.sparklight.com/internet",
  image: null,
  logo: null,
};

const FONT_STACK = `"Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
const BRAND_COLOR = "#8d3b91";

// ---------- helpers ----------
function mlaTitleCase(input) {
  if (!input) return "";
  const small = new Set(["a","an","and","as","at","but","by","for","in","nor","of","on","or","so","the","to","up","yet","with"]);
  const words = String(input).split(/\s+/);
  return words.map((w, i) => {
    if (w === w.toUpperCase()) return w;
    const lower = w.toLowerCase();
    const firstOrLast = i === 0 || i === words.length - 1;
    return small.has(lower) && !firstOrLast ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

function sanitizeFilename(name) {
  return (name || "flyer").trim().replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_");
}

function wrapText(ctx, text, maxWidth) {
  const content = (text || "").trim();
  if (!content) return [""];
  const words = content.split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? line + " " + word : word;
    if (ctx.measureText(testLine).width > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function updateStateFromInputs() {
  const checked = document.querySelector('input[name="orientation"]:checked');
  state.orientation = checked ? checked.value : "landscape";
  state.eventName = document.getElementById("eventName")?.value.trim() || "";
  state.contestDetails = mlaTitleCase(document.getElementById("contestDetails")?.value.trim() || "");
  state.url = document.getElementById("url")?.value.trim() || "https://www.sparklight.com/internet";
}

// ---------- UI bindings ----------
document.querySelectorAll("input, textarea, select").forEach(el => {
  el.addEventListener("input", async () => {
    updateStateFromInputs();
    await drawFlyer();
  });
});

const imageInput = document.getElementById("imageUpload");
if (imageInput) {
  imageInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const img = new Image();
      img.onload = async () => {
        state.image = img;
        await drawFlyer();
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
}

document.getElementById("resetBtn")?.addEventListener("click", () => {
  document.getElementById("flyerForm")?.reset();
  state.eventName = "";
  state.contestDetails = "";
  state.url = "https://www.sparklight.com/internet";
  state.image = null;
  // Keep current orientation radio default after reset
  const checked = document.querySelector('input[name="orientation"]:checked');
  state.orientation = checked ? checked.value : "landscape";
  drawFlyer();
});

document.getElementById("saveBtn")?.addEventListener("click", async () => {
  const format = document.getElementById("downloadFormat")?.value || "pdf";
  const baseName = sanitizeFilename(state.eventName || "flyer");

  if (format === "jpg") {
    const link = document.createElement("a");
    link.download = `${baseName}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.click();
  } else {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: state.orientation === "portrait" ? "p" : "l",
      unit: "pt",
      format: [canvas.width, canvas.height]
    });
    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${baseName}.pdf`);
  }
});

// ---------- draw ----------
async function drawFlyer() {
  // canvas size by orientation
  const W = state.orientation === "portrait" ? 850 : 1100;
  const H = state.orientation === "portrait" ? 1100 : 850;
  canvas.width = W;
  canvas.height = H;

  // white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // background image (optional) with soft top gradient for readability
  if (state.image) {
    const imgAspect = state.image.width / state.image.height;
    const canvasAspect = W / H;
    let drawW, drawH, offsetX, offsetY;

    if (imgAspect > canvasAspect) {
      drawH = H;
      drawW = drawH * imgAspect;
      offsetX = (W - drawW) / 2;
      offsetY = 0;
    } else {
      drawW = W;
      drawH = drawW / imgAspect;
      offsetX = 0;
      offsetY = (H - drawH) / 2;
    }

    ctx.globalAlpha = 0.7;
    ctx.drawImage(state.image, offsetX, offsetY, drawW, drawH);
    ctx.globalAlpha = 1;

    const gradientHeight = H * 0.4;
    const gradient = ctx.createLinearGradient(0, 0, 0, gradientHeight);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, gradientHeight);
  }

  // logo (optional) — centered top
  if (state.logo) {
    const logoW = Math.max(W * 0.2, 40);
    const logoH = logoW / (state.logo.width / state.logo.height);
    ctx.drawImage(state.logo, (W - logoW) / 2, 10, logoW, logoH);
  }

  // layout metrics
  const qrSize = W * 0.25;
  const qrPadding = qrSize * 0.10;
  const labelFontSize = qrSize * 0.08;
  const maxTextWidth = qrSize * 2.5;
  const fontSize = qrSize * 0.26;

  // contest text
  ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
  ctx.fillStyle = BRAND_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const lines = wrapText(ctx, state.contestDetails, maxTextWidth);

  // ---- LINE SPACING EXACTLY 1.0x ----
  const lineSpacing = fontSize * 1.0;

  // total text block height (if n lines, last baseline sits at (n-1)*lineSpacing;
  // using n*lineSpacing gives a bit more breathing room above QR, matching prior layout)
  const textBlockHeight = lines.length * lineSpacing;

  // center text + QR group vertically
  const contentTopY = H / 2 - (textBlockHeight + qrSize + labelFontSize + qrPadding * 2 + 40) / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, contentTopY + i * lineSpacing);
  });

  // QR container
  const qrBoxTop = contentTopY + textBlockHeight + 40;
  const boxX = (W - (qrSize + qrPadding * 2)) / 2;
  const boxY = qrBoxTop;
  const qrTotalHeight = qrSize + qrPadding * 2 + labelFontSize * 1.2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(boxX, boxY, qrSize + qrPadding * 2, qrTotalHeight);

  // generate QR
  const qrDataURL = await QRCode.toDataURL(state.url, {
    width: Math.round(qrSize),
    margin: 0,
    color: { dark: "#000000", light: "#ffffff" }
  });

  const qrImg = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = qrDataURL;
  });

  // draw QR
  const qrX = boxX + qrPadding;
  const qrY = boxY + qrPadding;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // label
  const labelY = qrY + qrSize + 10;
  ctx.font = `bold ${labelFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Scan to Enter", W / 2, labelY);
}

// load logo (optional)
const logoImage = new Image();
logoImage.onload = () => { state.logo = logoImage; drawFlyer(); };
logoImage.src = "sparklight-logo.png";

// init
updateStateFromInputs();
drawFlyer();
