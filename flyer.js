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

const FONT_STACK = "Arial, sans-serif";
const PURPLE = "#8d3b91";

// MLA-style title case, except for manually capitalized words (like TV)
function mlaTitleCase(text) {
  const smallWords = ["a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "from", "by", "of"];
  return text
    .split(" ")
    .map((word, i) => {
      if (word === word.toUpperCase()) return word; // preserve ALL CAPS (like TV)
      const lower = word.toLowerCase();
      if (i !== 0 && smallWords.includes(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function updateStateFromInputs() {
  state.orientation = document.querySelector('input[name="orientation"]:checked').value;
  state.eventName = document.getElementById("eventName").value.trim();
  state.contestDetails = mlaTitleCase(document.getElementById("contestDetails").value.trim());
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

document.getElementById("saveBtn").addEventListener("click", () => {
  const fileBase = state.eventName.trim() || "flyer";
  const safeName = fileBase.replace(/\s+/g, "_");

  // Save as JPG
  const jpgLink = document.createElement("a");
  jpgLink.download = `${safeName}.jpg`;
  jpgLink.href = canvas.toDataURL("image/jpeg");
  jpgLink.click();

  // Save as PDF
  const pdf = new jsPDF({
    orientation: state.orientation,
    unit: "pt",
    format: [canvas.width, canvas.height],
  });
  pdf.addImage(canvas.toDataURL("image/jpeg"), "JPEG", 0, 0, canvas.width, canvas.height);
  pdf.save(`${safeName}.pdf`);
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

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.7;
    ctx.drawImage(state.image, offsetX, offsetY, drawWidth, drawHeight);
    ctx.globalAlpha = 1.0;

    // Feathered top gradient
    const gradientHeight = H * 0.4;
    const gradient = ctx.createLinearGradient(0, 0, 0, gradientHeight);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, gradientHeight);
  }

  // QR code specs
  const qrSize = W * 0.25;
  const qrPadding = qrSize * 0.1;
  const labelFontSize = qrSize * 0.07;
  const qrTotalHeight = qrSize + qrPadding * 2 + labelFontSize * 1.2;
  const boxX = (W - qrSize - qrPadding * 2) / 2;
  const boxY = (H - qrTotalHeight) / 2;

  // Contest Title (2.5x QR box width)
  const maxTextWidth = qrSize * 2.5;
  const fontSize = qrSize * 0.25;
  ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
  ctx.fillStyle = PURPLE;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const lines = [];
  const words = state.contestDetails.split(" ");
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxTextWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);

  const spacing = fontSize * 1.05;
  const totalHeight = spacing * lines.length;
  const top = boxY / 2 + totalHeight / 3;

  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, top - totalHeight / 2 + i * spacing);
  });

  // QR White Box
  ctx.fillStyle = "#fff";
  ctx.fillRect(boxX, boxY, qrSize + qrPadding * 2, qrTotalHeight);

  // QR code itself
  const qrDataURL = await QRCode.toDataURL(state.url, {
    width: Math.round(qrSize),
    margin: 0,
    color: { dark: "#000", light: "#fff" },
  });
  const qrImg = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = qrDataURL;
  });

  ctx.drawImage(qrImg, boxX + qrPadding, boxY + qrPadding, qrSize, qrSize);

  // Label: Scan to Enter
  ctx.font = `bold ${labelFontSize * 0.85}px ${FONT_STACK}`;
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Scan to Enter", W / 2, boxY + qrPadding + qrSize + qrPadding * 0.2);

  // Footer Disclaimer
  const footerFontSize = 10;
  const footerHeight = footerFontSize * 3;
  const footerTop = H - footerHeight;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, footerTop, W, footerHeight);

  ctx.font = `italic ${footerFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.disclaimer, W / 2, H - footerHeight / 2);
}

// Initial render
updateStateFromInputs();
drawFlyer();
