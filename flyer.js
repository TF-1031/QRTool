// ================================
// CANVAS + CTX
// ================================
const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

const headerLogo = document.getElementById("headerLogo");

// Mobile label
const bgLabel = document.getElementById("bgLabel");
if (/Mobi|Android/i.test(navigator.userAgent)) {
  bgLabel.textContent = "Background Image (Choose File or Take Photo)";
}

// ================================
// MLA TITLE CASE (protect acronyms)
// ================================
function toMLATitleCase(text) {
  const alwaysCap = ["TV", "USA", "UK", "HD", "4K"];
  return text
    .split(" ")
    .map(w => {
      if (alwaysCap.includes(w.toUpperCase())) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

// ================================
// FILENAME BUILDER
// ================================
function makeFilename(eventName) {
  const now = new Date();
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const mon = months[now.getMonth()];
  const yr = now.getFullYear().toString().slice(-2);
  return `${eventName.replace(/\s+/g,"_")}_${mon}${yr}`;
}

// ================================
// TEXT WRAP
// ================================
function wrapTextBlock(text, fontSize, maxWidth) {
  ctx.font = `bold ${fontSize}px Arial`;
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (let w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(line.trim());
      line = w + " ";
    } else {
      line = test;
    }
  }
  lines.push(line.trim());
  return lines;
}

// ================================
// MAIN DRAW FUNCTION
// ================================
async function drawFlyer() {

  // Swap header to DONE version once editing
  headerLogo.src = "eventflyerbuilder-done.png";

  const orient = document.querySelector("input[name='orient']:checked").value;

  // Landscape = 1100x850  | Portrait = 850x1100
  const W = orient === "portrait" ? 850 : 1100;
  const H = orient === "portrait" ? 1100 : 850;

  canvas.width = W;
  canvas.height = H;

  // Fill white
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);

  // ----------------------------
  // READ FORM VALUES
  // ----------------------------
  const contestDetails = document.getElementById("contestDetails").value.trim();
  const url = document.getElementById("contestURL").value.trim();
  const textColor = document.getElementById("textColorSelect").value;
  const outline = document.getElementById("effectOutline").checked;
  const shadow = document.getElementById("effectShadow").checked;

  // ----------------------------
  // BACKGROUND IMAGE
  // ----------------------------
  const fileInput = document.getElementById("imageUpload");
  let bgImage = null;

  if (fileInput.files && fileInput.files[0]) {
    bgImage = new Image();
    bgImage.src = URL.createObjectURL(fileInput.files[0]);

    await new Promise(res => (bgImage.onload = res));

    const imgRatio = bgImage.width / bgImage.height;
    const canvasRatio = W / H;
    let bw, bh, bx, by;

    if (imgRatio > canvasRatio) {
      bh = H;
      bw = bh * imgRatio;
      bx = (W - bw) / 2;
      by = 0;
    } else {
      bw = W;
      bh = bw / imgRatio;
      bx = 0;
      by = (H - bh) / 2;
    }

    ctx.drawImage(bgImage, bx, by, bw, bh);
  }

  // ----------------------------
  // GRADIENT WASH (draw BEFORE text)
  // ----------------------------
  const washHeight = Math.min(0.45 * H, 360);
  const grad = ctx.createLinearGradient(0, 0, 0, washHeight);
  grad.addColorStop(0, "rgba(255,255,255,0.92)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, washHeight);

  // ----------------------------
  // SPARKLIGHT LOGO (PNG)
  // ----------------------------
  const logo = new Image();
  logo.src = "sparklight-logo.png";
  await new Promise(res => (logo.onload = res));

  const logoWidth = 300;
  const logoHeight = 70;
  const logoX = W / 2 - logoWidth / 2;
  const logoY = washHeight - logoHeight - 10;

  ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);

  const logoBottom = logoY + logoHeight;

  // ----------------------------
  // HEADLINE (Contest Entry Details)
  // ----------------------------
  let fontSize = 64;
  let maxWidth = W * 0.8;
  let lines = wrapTextBlock(contestDetails, fontSize, maxWidth);

  // Shrink until no more than 2 lines
  while (lines.length > 2 && fontSize > 22) {
    fontSize -= 2;
    lines = wrapTextBlock(contestDetails, fontSize, maxWidth);
  }

  const lineGap = fontSize * 0.25;
  const blockH = lines.length * (fontSize + lineGap);

  // ----------------------------
  // Position headline BELOW logo
  // ----------------------------
  let headlineTop = logoBottom + 28;

  const idealQrZoneTop = Math.max(H * 0.48, headlineTop + blockH + 120);
  const available = idealQrZoneTop - headlineTop - blockH - 40;

  if (available > 0) headlineTop += Math.min(available * 0.45, 60);

  // Text effects
  ctx.textAlign = "center";
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = textColor;

  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
  } else {
    ctx.shadowColor = "transparent";
  }

  if (outline) {
    ctx.lineWidth = 6;
    ctx.strokeStyle = "white";
  }

  // Draw headline
  lines.forEach((line, i) => {
    const y = headlineTop + i * (fontSize + lineGap);
    if (outline) ctx.strokeText(line, W / 2, y);
    ctx.fillText(line, W / 2, y);
  });

  // ----------------------------
  // QR CODE
  // ----------------------------
  const qrData = await QRCode.toDataURL(url);
  const qrImg = new Image();
  qrImg.src = qrData;
  await new Promise(res => (qrImg.onload = res));

  const qrSize = 300;
  const qrTop = Math.max(idealQrZoneTop, headlineTop + blockH + 40);

  ctx.drawImage(qrImg, W / 2 - qrSize / 2, qrTop, qrSize, qrSize);

  // "SCAN TO ENTER"
  ctx.shadowColor = "transparent";
  ctx.fillStyle = textColor;
  ctx.font = "bold 26px Arial";
  ctx.fillText("Scan to Enter", W / 2, qrTop + qrSize + 40);
}

// ================================
// EVENT LISTENERS
// ================================
document
  .querySelectorAll("#flyerForm input, #flyerForm select, #flyerForm textarea")
  .forEach(el => el.addEventListener("input", drawFlyer));

document.getElementById("resetBtn").addEventListener("click", () => {
  headerLogo.src = "eventflyerbuilder-logo.png";
  document.getElementById("flyerForm").reset();
  drawFlyer();
});

document.getElementById("downloadBtn").addEventListener("click", async () => {
  await drawFlyer();

  const fmt = document.getElementById("downloadFormat").value;
  const eventName = document.getElementById("eventName").value || "Flyer";
  const filename = makeFilename(eventName);

  if (fmt === "png") {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${filename}.png`;
    a.click();
  } else {
    const pdf = new jspdf.jsPDF("l", "pt", [canvas.width, canvas.height]);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0);
    pdf.save(`${filename}.pdf`);
  }
});

// Initial render
drawFlyer();
