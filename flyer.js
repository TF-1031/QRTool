import QRCode from "https://cdn.skypack.dev/qrcode";

const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

const state = {
  orientation: "portrait",
  eventName: "",
  contestDetails: "",
  url: "https://www.sparklight.com/internet",
  disclaimer:
    "No purchase necessary. Entry open to all eligible participants.\nScan QR Code to see full terms and conditions at the contest link.",
  image: null,
};

const FONT_STACK = `"Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
const BRAND_COLOR = "#8d3b91";

function mlaTitleCase(input) {
  const smallWords = new Set([
    "a","an","and","as","at","but","by","for","in","nor","of","on","or","so","the","to","up","yet","with"
  ]);
  const words = input.split(/\s+/);
  return words.map((word, idx) => {
    if (word === word.toUpperCase()) {
      // user typed an acronym/all‑caps like TV
      return word;
    }
    const lower = word.toLowerCase();
    const isFirstOrLast = (idx === 0) || (idx === words.length - 1);
    if (smallWords.has(lower) && !isFirstOrLast) {
      return lower;
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

function updateStateFromInputs() {
  state.orientation = document.querySelector('input[name="orientation"]:checked').value;
  state.eventName = document.getElementById("eventName").value.trim();
  state.contestDetails = mlaTitleCase(document.getElementById("contestDetails").value.trim());
  state.url = document.getElementById("url").value.trim();
  state.disclaimer = document.getElementById("disclaimer").value.trim() || state.disclaimer;
}

document.querySelectorAll("input, textarea, select").forEach((el) => {
  el.addEventListener("input", async () => {
    updateStateFromInputs();
    await drawFlyer();
  });
});

document.getElementById("imageUpload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        state.image = img;
        await drawFlyer();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("flyerForm").reset();
  state.eventName = "";
  state.contestDetails = "";
  state.url = "https://www.sparklight.com/internet";
  state.disclaimer =
    "No purchase necessary. Entry open to all eligible participants.\nScan QR Code to see full terms and conditions at the contest link.";
  state.image = null;
  drawFlyer();
});

document.getElementById("saveBtn").addEventListener("click", async () => {
  const format = document.getElementById("downloadFormat").value;
  if (format === "jpg") {
    const link = document.createElement("a");
    link.download = "flyer.jpg";
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.click();
  } else if (format === "pdf") {
    const { jsPDF } = window.jspdf;
    const dims = { w: canvas.width, h: canvas.height };
    const pdf = new jsPDF({
      orientation: state.orientation === "portrait" ? "p" : "l",
      unit: "pt",
      format: [dims.w, dims.h]
    });
    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    pdf.addImage(imgData, "JPEG", 0, 0, dims.w, dims.h);
    pdf.save("flyer.pdf");
  }
});

async function drawFlyer() {
  const W = state.orientation === "portrait" ? 850 : 1100;
  const H = state.orientation === "portrait" ? 1100 : 850;
  canvas.width = W;
  canvas.height = H;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Background Image
  if (state.image) {
    const imgAspect = state.image.width / state.image.height;
    const canvasAspect = W / (H - 60);
    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgAspect > canvasAspect) {
      drawHeight = H - 60;
      drawWidth = imgAspect * drawHeight;
      offsetX = (W - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = W;
      drawHeight = drawWidth / imgAspect;
      offsetX = 0;
      offsetY = ((H - 60) - drawHeight) / 2;
    }

    ctx.globalAlpha = 0.7;
    ctx.drawImage(state.image, offsetX, offsetY, drawWidth, drawHeight);
    ctx.globalAlpha = 1.0;

    const gradientHeight = (H - 60) * 0.4;
    const gradient = ctx.createLinearGradient(0, 0, 0, gradientHeight);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, gradientHeight);
  }

  // QR Box calculations
  const qrSize = W * 0.30;
  const qrPadding = qrSize * 0.10;
  const labelFontSize = qrSize * 0.08;
  const qrTotalHeight = qrSize + qrPadding * 2 + labelFontSize * 1.2;
  const boxX = (W - (qrSize + qrPadding * 2)) / 2;
  const boxY = (H - 60 - qrTotalHeight) / 2;

  // Contest Entry Details title
  if (state.contestDetails) {
    const fontSize = qrSize * 0.26;
    ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
    ctx.fillStyle = BRAND_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const wrappedLines = wrapText(ctx, state.contestDetails, qrSize * 2.5);
    const lineHeight = fontSize * 0.95;
    const blockHeight = wrappedLines.length * lineHeight;
    const startY = boxY / 2 - (blockHeight / 2);

    wrappedLines.forEach((line, i) => {
      ctx.fillText(line, W / 2, startY + i * lineHeight);
    });
  }

  // Draw QR white box
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(boxX, boxY, qrSize + qrPadding * 2, qrTotalHeight);

  // Generate QR
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

  const qrX = boxX + qrPadding;
  const qrY = boxY + qrPadding;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // "Scan to Enter" label
  const labelY = qrY + qrSize + qrPadding * 0.3;
  ctx.font = `bold ${labelFontSize * 0.85}px ${FONT_STACK}`;
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Scan to Enter", W / 2, labelY);

  // Footer disclaimer
  const footerFontSize = 10;
  const footerHeight = 3 * footerFontSize;
  const footerMarginTop = 20;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, H - footerHeight - footerMarginTop, W, footerHeight + footerMarginTop);

  ctx.font = `italic ${footerFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.disclaimer, W / 2, H - footerHeight / 2);
}

// Wrap‑text helper
function wrapText(context, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = context.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      lines.push(line.trim());
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  return lines;
}

// Initial setup
updateStateFromInputs();
drawFlyer();
