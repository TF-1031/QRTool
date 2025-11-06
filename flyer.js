import QRCode from "https://cdn.skypack.dev/qrcode";

const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

// ---------- STATE ----------
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


// ---------- HELPERS ----------
function mlaTitleCase(input) {
  if (!input) return "";
  const small = new Set(["a","an","and","as","at","but","by","for","in","nor","of","on","or","so","the","to","up","yet","with"]);
  const words = input.split(/\s+/);

  return words.map((w,i)=>{
    if (w===w.toUpperCase()) return w;
    const lower = w.toLowerCase();
    const firstOrLast = i===0 || i===words.length-1;
    return small.has(lower) && !firstOrLast ? lower : lower.charAt(0).toUpperCase()+lower.slice(1);
  }).join(" ");
}

function sanitizeFilename(name) {
  return (name||"flyer").trim().replace(/[^a-zA-Z0-9 _-]/g,"").replace(/\s+/g,"_");
}

function wrapText(ctx, text, maxWidth) {
  const words = (text||"").split(/\s+/);
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

function updateStateFromInputs() {
  state.orientation = document.querySelector('input[name="orientation"]:checked').value;
  state.eventName = document.getElementById("eventName").value.trim();
  state.contestDetails = mlaTitleCase(document.getElementById("contestDetails").value.trim());
  state.url = document.getElementById("url").value.trim();
  state.whiteText = document.getElementById("whiteTextToggle").checked;
}


// ---------- EVENTS ----------
document.querySelectorAll("input, textarea, select").forEach(el => {
  el.addEventListener("input", async () => {
    updateStateFromInputs();
    await drawFlyer();
  });
});

document.getElementById("imageUpload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
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


// ---------- DRAW FLYER ----------
async function drawFlyer() {
  const W = state.orientation === "portrait" ? 850 : 1100;
  const H = state.orientation === "portrait" ? 1100 : 850;
  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,W,H);

  // BG Image
  if (state.image) {
    const imgAspect = state.image.width / state.image.height;
    const canvasAspect = W/H;
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

    // gradient top fade
    const gradHeight = H * 0.4;
    const grad = ctx.createLinearGradient(0,0,0,gradHeight);
    grad.addColorStop(0,"rgba(255,255,255,1)");
    grad.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,gradHeight);
  }

  // Sparklight Logo
  if (state.logo) {
    const logoW = Math.max(W*0.2, 40);
    const logoH = logoW / (state.logo.width/state.logo.height);
    ctx.drawImage(state.logo, (W-logoW)/2, 20, logoW, logoH);
  }


  // -------- TEXT FITTING (max 2 lines) --------
  const qrSize = W * 0.25;
  const qrPadding = qrSize * 0.10;
  const labelFontSize = qrSize * 0.08;

  let fontSize = qrSize * 0.26;
  let maxTextWidth = qrSize * 2.5;
  let MIN_FONT = 20;

  ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
  let testLines = wrapText(ctx, state.contestDetails, maxTextWidth);

  while (testLines.length > 2 && fontSize > MIN_FONT) {
    fontSize -= 2;
    ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
    testLines = wrapText(ctx, state.contestDetails, maxTextWidth);
  }

  const lines = testLines;
  const lineSpacing = fontSize * 1.1;
  const textBlockHeight = lines.length * lineSpacing;

  ctx.fillStyle = state.whiteText ? "#ffffff" : BRAND_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const contentTopY = H/2 - (
    textBlockHeight + qrSize + labelFontSize + qrPadding*2 + 40
  )/2;

  lines.forEach((line,i)=>{
    ctx.fillText(line, W/2, contentTopY + i*lineSpacing);
  });


  // QR area
  const qrBoxTop = contentTopY + textBlockHeight + 40;
  const boxX = (W - (qrSize + qrPadding*2)) / 2;
  const boxY = qrBoxTop;

  const qrDataURL = await QRCode.toDataURL(state.url, {
    width: Math.round(qrSize),
    margin: 0,
    color: { dark: "#000000", light: "#ffffff" }
  });

  const qrImg = await new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.src = qrDataURL;
  });

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(boxX, boxY, qrSize + qrPadding*2, qrSize + qrPadding*2 + labelFontSize*1.2);

  ctx.drawImage(qrImg, boxX+qrPadding, boxY+qrPadding, qrSize, qrSize);

  // label
  ctx.font = `bold ${labelFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = "#000";
  ctx.fillText("Scan to Enter", W/2, boxY + qrPadding + qrSize + 10);
}


// ---------- LOAD SPARKLIGHT LOGO ----------
const logoImage = new Image();
logoImage.onload = () => {
  state.logo = logoImage;
  drawFlyer();
};
logoImage.src = "sparklight-logo.png";

updateStateFromInputs();
drawFlyer();
