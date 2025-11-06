import QRCode from "https://cdn.skypack.dev/qrcode";

const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

// ✅ Header images
const HEADER_NORMAL = "eventflyerbuilder-logo.png";
const HEADER_DONE = "eventflyerbuilder-done.png";

// ✅ Track when text has been typed
let headerSwapped = false;

const state = {
  orientation: document.querySelector('input[name="orientation"]:checked')?.value || "landscape",
  eventName: "",
  contestDetails: "",
  url: "https://www.sparklight.com/internet",
  image: null,
  logo: null,
  textColor: "#A600A5",
  effectOutline: false,
  effectShadow: false,
  effectBox: false,
};

const FONT_STACK = `"Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

// ----------------------------
// UPDATE STATE FROM INPUTS
// ----------------------------
function updateStateFromInputs() {
  state.orientation = document.querySelector('input[name="orientation"]:checked').value;
  state.eventName = document.getElementById("eventName").value.trim();
  state.contestDetails = document.getElementById("contestDetails").value.trim();
  state.url = document.getElementById("url").value.trim();

  state.textColor = document.getElementById("textColorSelect").value;

  state.effectOutline = document.getElementById("effectOutline").checked;
  state.effectShadow = document.getElementById("effectShadow").checked;
  state.effectBox = document.getElementById("effectBox").checked;

  // ✅ Header image swap once user types anything
  const headerImage = document.getElementById("headerImage");

  if (state.eventName || state.contestDetails) {
    if (!headerSwapped) {
      headerSwapped = true;
      headerImage.src = HEADER_DONE;
    }
  } else {
    headerSwapped = false;
    headerImage.src = HEADER_NORMAL;
  }
}

// ----------------------------
// INPUT EVENTS
// ----------------------------
document.querySelectorAll("input, textarea, select").forEach(el => {
  el.addEventListener("input", async () => {
    updateStateFromInputs();
    await drawFlyer();
  });
});

// Background Image Upload
document.getElementById("imageUpload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      drawFlyer();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

// Reset Button
document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("flyerForm").reset();
  headerSwapped = false;
  document.getElementById("headerImage").src = HEADER_NORMAL;

  state.eventName = "";
  state.contestDetails = "";
  state.url = "https://www.sparklight.com/internet";
  state.textColor = "#A600A5";

  state.effectOutline = false;
  state.effectShadow = false;
  state.effectBox = false;

  state.image = null;

  drawFlyer();
});

// Save Button
document.getElementById("saveBtn").addEventListener("click", async () => {
  const format = document.getElementById("downloadFormat").value;
  const baseName = sanitizeFilename(state.eventName || "flyer");

  if (format === "jpg") {
    const link = document.createElement("a");
    link.download = `${baseName}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.click();
  }

  if (format === "pdf") {
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

function sanitizeFilename(name) {
  return name.trim().replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_");
}

// ----------------------------
// TEXT WRAP + AUTO-SCALE LOGIC
// ----------------------------
function getWrappedLines(text, maxWidth, fontSize) {
  ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (let word of words) {
    const testLine = line + word + " ";
    if (ctx.measureText(testLine).width > maxWidth) {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line = testLine;
    }
  }
  if (line.trim()) lines.push(line.trim());

  return lines;
}

function autoScaleText(text, maxWidth, maxLines, initialFontSize) {
  let fontSize = initialFontSize;

  while (fontSize > 10) {
    const lines = getWrappedLines(text, maxWidth, fontSize);
    if (lines.length <= maxLines) {
      return { fontSize, lines };
    }
    fontSize -= 2;
  }

  return { fontSize: 10, lines: getWrappedLines(text, maxWidth, 10) };
}

// ----------------------------
// MAIN DRAWING FUNCTION
// ----------------------------
async function drawFlyer() {
  const W = state.orientation === "portrait" ? 850 : 1100;
  const H = state.orientation === "portrait" ? 1100 : 850;

  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Background image
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

    ctx.globalAlpha = 0.4;
    ctx.drawImage(state.image, offsetX, offsetY, drawW, drawH);
    ctx.globalAlpha = 1.0;
  }

  // Sparklight logo
  if (state.logo) {
    const logoWidth = Math.max(W * 0.20, 120);
    const logoHeight = logoWidth / (state.logo.width / state.logo.height);
    ctx.drawImage(state.logo, (W - logoWidth) / 2, 20, logoWidth, logoHeight);
  }

  // Text block
  const qrSize = W * 0.25;
  const qrPadding = qrSize * 0.10;

  const maxTextWidth = W * 0.70;
  const initialFontSize = qrSize * 0.26;

  const { fontSize, lines } = autoScaleText(
    state.contestDetails,
    maxTextWidth,
    2,
    initialFontSize
  );

  const lineSpacing = fontSize * 1.1;
  const textBlockHeight = lines.length * lineSpacing;

  const topY = H / 2 - (textBlockHeight + qrSize + 60) / 2;

  // Effects
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `900 ${fontSize}px ${FONT_STACK}`;

  lines.forEach((line, i) => {
    const y = topY + i * lineSpacing;

    if (state.effectBox) {
      const metrics = ctx.measureText(line);
      const padding = 18;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(
        W / 2 - metrics.width / 2 - padding,
        y - padding / 2,
        metrics.width + padding * 2,
        fontSize + padding
      );
    }

    if (state.effectShadow) {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
    } else {
      ctx.shadowColor = "transparent";
    }

    if (state.effectOutline) {
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = fontSize * 0.10;
      ctx.strokeText(line, W / 2, y);
    }

    ctx.fillStyle = state.textColor;
    ctx.fillText(line, W / 2, y);
  });

  // QR box
  const boxX = (W - (qrSize + qrPadding * 2)) / 2;
  const boxY = topY + textBlockHeight + 35;
  const qrTotalHeight = qrSize + qrPadding * 2 + 40;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(boxX, boxY, qrSize + qrPadding * 2, qrTotalHeight);

  const qrDataURL = await QRCode.toDataURL(state.url, {
    width: Math.round(qrSize),
    margin: 0,
    color: { dark: "#000000", light: "#ffffff" }
  });

  const qrImg = await loadImage(qrDataURL);

  ctx.drawImage(qrImg, boxX + qrPadding, boxY + qrPadding, qrSize, qrSize);

  ctx.fillStyle = "#000000";
  ctx.font = `bold ${qrSize * 0.09}px ${FONT_STACK}`;
  ctx.fillText("Scan to Enter", W / 2, boxY + qrSize + qrPadding + 10);
}

// Image loader
function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

// Load Sparklight logo
const logoImg = new Image();
logoImg.onload = () => {
  state.logo = logoImg;
  drawFlyer();
};
logoImg.src = "sparklight-logo.png";

// Init
updateStateFromInputs();
drawFlyer();
