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

function mlaTitleCase(text) {
  const smallWords = new Set([
    "a", "an", "and", "as", "at", "but", "by", "for", "in",
    "nor", "of", "on", "or", "so", "the", "to", "up", "yet", "with"
  ]);
  const words = text.split(/\s+/);
  return words.map((word, i) => {
    if (word === word.toUpperCase()) return word; // preserve ALL CAPS
    const lower = word.toLowerCase();
    if (smallWords.has(lower) && i !== 0 && i !== words.length - 1) {
      return lower;
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

function sanitizeFilename(name) {
  return name.trim().replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_");
}

function updateStateFromInputs() {
  state.orientation = document.querySelector(
    'input[name="orientation"]:checked'
  ).value;
  state.eventName = document.getElementById("eventName").value.trim();
  state.contestDetails = mlaTitleCase(
    document.getElementById("contestDetails").value.trim()
  );
  state.url = document.getElementById("url").value.trim();
  state.disclaimer = document.getElementById("disclaimer").value.trim();
}

document.querySelectorAll("input, textarea").forEach((input) => {
  input.addEventListener("input", async () => {
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
  const baseName = sanitizeFilename(state.eventName || "flyer");

  if (format === "jpg") {
    const link = document.createElement("a");
    link.download = `${baseName}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.click();
  } else if (format === "pdf") {
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

async function drawFlyer() {
  const W = state.orientation === "portrait" ? 850 : 1100;
  const H = state.orientation === "portrait" ? 1100 : 850;
  canvas.width = W;
  canvas.height = H;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  if (state.image) {
    const imgAspect = state.image.width / state.image.height;
    const canvasAspect = W / H;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgAspect > canvasAspect) {
      drawHeight = H;
      drawWidth = H * imgAspect;
      offsetX = (W - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = W;
      drawHeight = W / imgAspect;
      offsetX = 0;
      offsetY = (H - drawHeight) / 2;
    }

    ctx.globalAlpha = 0.7;
    ctx.drawImage(state.image, offsetX, offsetY, drawWidth, drawHeight);
    ctx.globalAlpha = 1.0;

    const gradientHeight = H * 0.4;
    const gradient = ctx.createLinearGradient(0, 0, 0, gradientHeight);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, gradientHeight);
  }

  const qrSize = W * 0.25;
  const qrPadding = qrSize * 0.1;
  const labelFontSize = qrSize * 0.08;
  const maxTextWidth = qrSize * 2.5;
  const textFontSize = qrSize * 0.26;
  const textLineSpacing = textFontSize * 0.9;

  // Split contest details into lines
  ctx.font = `900 ${textFontSize}px ${FONT_STACK}`;
  const textLines = wrapText(ctx, state.contestDetails, maxTextWidth);
  const textBlockHeight = textLines.length * textLineSpacing;

  // Total space: text + padding + QR + label
  const totalContentHeight = textBlockHeight + 20 + qrPadding * 2 + qrSize + 10 + labelFontSize * 1.2;
  const contentTopY = (H - totalContentHeight) / 2;

  // Draw contest details text
  ctx.fillStyle = BRAND_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  textLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, contentTopY + i * textLineSpacing);
  });

  const boxY = contentTopY + textBlockHeight + 20;
  const boxX = (W - qrSize - qrPadding * 2) / 2;

  // White QR box
  ctx.fillStyle = "#ffffff";
  const qrBoxHeight = qrPadding * 2 + qrSize + 10 + labelFontSize * 1.2;
  ctx.fillRect(boxX, boxY, qrSize + qrPadding * 2, qrBoxHeight);

  // Draw QR
  const qrDataURL = await QRCode.toDataURL(state.url, {
    width: Math.round(qrSize),
    margin: 0,
    color: { dark: "#000000", light: "#ffffff" },
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

  // Label below QR
  const labelY = qrY + qrSize + 10;
  ctx.font = `bold ${labelFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Scan to Enter", W / 2, labelY);

  // Disclaimer footer
  const footerFontSize = 10;
  const footerHeight = footerFontSize * 3;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, H - footerHeight, W, footerHeight);
  ctx.font = `italic ${footerFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.disclaimer, W / 2, H - footerHeight / 2);
}

// Wrap text into lines that fit within maxWidth
function wrapText(context, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const testLine = current ? current + " " + word : word;
    if (context.measureText(testLine).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = testLine;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Init
updateStateFromInputs();
drawFlyer();
