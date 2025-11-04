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

function titleCase(str) {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
  });
}

function updateStateFromInputs() {
  state.orientation = document.querySelector(
    'input[name="orientation"]:checked'
  ).value;
  state.eventName = document.getElementById("eventName").value;
  state.contestDetails = titleCase(
    document.getElementById("contestDetails").value.trim()
  );
  state.url = document.getElementById("url").value;
  state.disclaimer = document.getElementById("disclaimer").value;
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
  const link = document.createElement("a");
  link.download = "flyer.jpg"; // Correct file extension
  link.href = canvas.toDataURL("image/jpeg", 0.92);
  link.click();
});

async function drawFlyer() {
  const W = state.orientation === "portrait" ? 850 : 1100;
  const H = state.orientation === "portrait" ? 1100 : 850;
  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  if (state.image) {
    const imgAspect = state.image.width / state.image.height;
    const canvasAspect = W / (H - 40);
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

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.7;
    ctx.drawImage(state.image, offsetX, offsetY, drawWidth, drawHeight);
    ctx.globalAlpha = 1.0;

    const gradientHeight = H * 0.45;
    const gradient = ctx.createLinearGradient(0, 0, 0, gradientHeight);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, gradientHeight);
  }

  const qrSize = W * 0.25;
  const qrPadding = qrSize * 0.1;
  const labelFontSize = qrSize * 0.07;

  const qrTotalHeight = qrSize + qrPadding * 2 + labelFontSize * 1.2;
  const boxX = (W - qrSize - qrPadding * 2) / 2;
  const boxY = (H - qrTotalHeight) / 2;

  // Title Text
  const textSize = qrSize * 0.26;
  ctx.font = `bold ${textSize}px ${FONT_STACK}`;
  ctx.fillStyle = PURPLE;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const textLines = state.contestDetails.split("\n");
  const lineSpacing = textSize * 1.05;
  const totalTextHeight = lineSpacing * textLines.length;
  const centerY = boxY / 2 + totalTextHeight / 3;

  textLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, centerY - totalTextHeight / 2 + i * lineSpacing);
  });

  // QR white box
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(boxX, boxY, qrSize + qrPadding * 2, qrTotalHeight);

  // QR code
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

  // Label
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

// Initial load
updateStateFromInputs();
drawFlyer();
