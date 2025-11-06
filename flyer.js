import QRCode from "https://cdn.skypack.dev/qrcode";

const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

// ✅ YOUR REAL HEADER IMAGE FILENAMES
const headerLogos = {
  default: "eventflyerbuilder-logo.png",
  done: "eventflyerbuilder-done.png"
};

let headerLogoImage = new Image();
headerLogoImage.src = headerLogos.default;

// ✅ SAFE FALLBACK if image missing or broken
headerLogoImage.onerror = () => {
  console.warn("Header default image failed to load. Using fallback.");
  headerLogoImage.src =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABC...";
};

let sparklightLogo = new Image();
sparklightLogo.src = "sparklight-logo.png";
sparklightLogo.onerror = () => {
  console.warn("Sparklight logo missing — skipping.");
  sparklightLogo = null;
};

// ---------------- STATE ----------------
const state = {
  orientation: "landscape",
  eventName: "",
  contestDetails: "",
  url: "https://www.sparklight.com/internet",

  whiteText: false,
  textColor: "#A600A5",
  effectOutline: false,
  effectShadow: false,
  effectBox: false,

  image: null
};

// ---------------- HELPERS ----------------
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  let lines = [];
  let line = "";

  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line = test;
    }
  }

  if (line.trim()) lines.push(line.trim());
  return lines;
}

function contrastColor(hex) {
  const c = hex.replace("#","").padStart(6,"0");
  const r = parseInt(c.substr(0,2),16);
  const g = parseInt(c.substr(2,2),16);
  const b = parseInt(c.substr(4,2),16);
  const L = 0.2126*r + 0.7152*g + 0.0722*b;
  return L > 160 ? "#000" : "#fff";
}

function drawRoundedRect(x,y,w,h,r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

// ---------------- FORM UPDATES ----------------
function updateState() {
  state.orientation =
    document.querySelector('input[name="orientation"]:checked').value;

  state.eventName = document.getElementById("eventName").value;
  state.contestDetails = document.getElementById("contestDetails").value;
  state.url = document.getElementById("url").value;

  state.whiteText = document.getElementById("whiteTextToggle").checked;
  state.textColor = document.getElementById("textColorSelect").value;

  state.effectOutline = document.getElementById("effectOutline").checked;
  state.effectShadow = document.getElementById("effectShadow").checked;
  state.effectBox = document.getElementById("effectBox").checked;
}

// ---------------- DRAWER ----------------
async function drawFlyer() {
  const W = state.orientation === "portrait" ? 850 : 1100;
  const H = state.orientation === "portrait" ? 1100 : 850;

  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0,0,W,H);

  // background image
  if (state.image) {
    const img = state.image;
    const imgAR = img.width / img.height;
    const canAR = W / H;

    let drawW, drawH, x, y;
    if (imgAR > canAR) {
      drawH = H;
      drawW = H * imgAR;
      x = (W - drawW) / 2;
      y = 0;
    } else {
      drawW = W;
      drawH = W / imgAR;
      x = 0;
      y = (H - drawH) / 2;
    }

    ctx.globalAlpha = 0.7;
    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.globalAlpha = 1;
  }

  // fade
  const grad = ctx.createLinearGradient(0,0,0,H*0.3);
  grad.addColorStop(0,"rgba(255,255,255,1)");
  grad.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H*0.3);

  // ✅ HEADER LOGO — WITH SAFE CHECK
  if (headerLogoImage.complete && headerLogoImage.naturalWidth > 0) {
    const lw = W * 0.25;
    const aspect = headerLogoImage.width / headerLogoImage.height;
    const lh = lw / aspect;
    ctx.drawImage(headerLogoImage, (W-lw)/2, 20, lw, lh);
  }

  // contest text
  let fontSize = W * 0.05;
  const maxWidth = W * 0.7;

  ctx.font = `900 ${fontSize}px Segoe UI`;
  let lines = wrapText(ctx, state.contestDetails, maxWidth);

  while (lines.length > 2 && fontSize > 18) {
    fontSize -= 2;
    ctx.font = `900 ${fontSize}px Segoe UI`;
    lines = wrapText(ctx, state.contestDetails, maxWidth);
  }

  const spacing = fontSize * 1.1;
  const textBlockHeight = lines.length * spacing;
  const textX = W / 2;
  const textY = H / 2 - textBlockHeight - 60;

  // background box
  if (state.effectBox) {
    drawRoundedRect(textX - maxWidth/2 - 20, textY - 20,
      maxWidth + 40, textBlockHeight + 40, 12);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill();
  }

  // draw text
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = state.whiteText ? "#fff" : state.textColor;

  if (state.effectShadow) {
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  const outlineColor = contrastColor(ctx.fillStyle);

  lines.forEach((line, i) => {
    const y = textY + i * spacing;
    if (state.effectOutline) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = outlineColor;
      ctx.strokeText(line, textX, y);
    }
    ctx.fillText(line, textX, y);
  });

  ctx.shadowColor = "transparent";

  // QR
  const qrSize = W * 0.25;
  const qrPad = 12;
  const qrX = (W - qrSize) / 2;
  const qrY = textY + textBlockHeight + 40;

  const qrURL = await QRCode.toDataURL(state.url, { width: qrSize });
  const qrImg = new Image();
  qrImg.src = qrURL;
  await new Promise(res => qrImg.onload = res);

  drawRoundedRect(qrX - qrPad, qrY - qrPad,
    qrSize + qrPad*2, qrSize + qrPad*2 + 30, 10);
  ctx.fillStyle = "#fff";
  ctx.fill();

  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.font = `bold ${fontSize*0.5}px Segoe UI`;
  ctx.fillStyle = "#000";
  ctx.fillText("Scan to Enter", W/2, qrY + qrSize + 10);
}

// ---------------- INPUT LISTENERS ----------------
document.querySelectorAll("input, textarea, select").forEach(el => {
  el.addEventListener("input", () => {
    updateState();
    headerLogoImage.src = headerLogos.done; // ✅ swap to done
    drawFlyer();
  });
});

// image upload
document.getElementById("imageUpload").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      headerLogoImage.src = headerLogos.done;
      drawFlyer();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

// reset
document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("flyerForm").reset();

  headerLogoImage.src = headerLogos.default;
  state.image = null;

  drawFlyer();
});

// save
document.getElementById("saveBtn").addEventListener("click", () => {
  const base = "Flyer";
  const format = document.getElementById("downloadFormat").value;

  if (format === "jpg") {
    const a = document.createElement("a");
    a.download = base + ".jpg";
    a.href = canvas.toDataURL("image/jpeg", 0.92);
    a.click();
  } else {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: state.orientation === "portrait" ? "p" : "l",
      unit: "pt",
      format: [canvas.width, canvas.height]
    });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0);
    pdf.save(base + ".pdf");
  }
});

// init
drawFlyer();
