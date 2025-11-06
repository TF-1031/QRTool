const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

const headerLogo = document.getElementById("headerLogo");

let bgImage = null;

// Mobile label change
if (/Mobi|Android/i.test(navigator.userAgent)) {
  document.getElementById("bgLabel").textContent =
    "Background Image (Choose File or Take a Photo)";
}

// MLA Title Case
function toMLA(str) {
  const forceCaps = ["TV", "USA", "UK", "HD", "4K"];
  return str
    .split(" ")
    .map(w => {
      if (forceCaps.includes(w.toUpperCase())) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

// Filename
function makeFilename(name) {
  const now = new Date();
  const m = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][now.getMonth()];
  const y = now.getFullYear().toString().slice(-2);
  return name.replace(/\s+/g, "_") + "_" + m + y;
}

// Handle image upload
document.getElementById("imageUpload").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    bgImage = new Image();
    bgImage.onload = drawFlyer;
    bgImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// Canvas drawing
async function drawFlyer() {
  headerLogo.src = "eventflyerbuilder-done.png";

  const W = 1100;
  const H = 850;
  canvas.width = W;
  canvas.height = H;

  // Background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);

  // If background image present
  if (bgImage) {
    const scale = Math.max(W / bgImage.width, H / bgImage.height);
    const bw = bgImage.width * scale;
    const bh = bgImage.height * scale;
    const bx = (W - bw) / 2;
    const by = (H - bh) / 2;
    ctx.drawImage(bgImage, bx, by, bw, bh);
  }

  // Read form
  const title = toMLA(document.getElementById("eventName").value.trim());
  const details = document.getElementById("contestDetails").value.trim();
  const url = document.getElementById("contestURL").value.trim();
  const color = document.getElementById("textColorSelect").value;

  const outline = document.getElementById("effectOutline").checked;
  const shadow = document.getElementById("effectShadow").checked;

  // Draw Sparklight Logo (pixel-perfect)
  const brand = new Image();
  brand.src = "sparklight-logo.png";
  await brand.decode();

  const maxW = 260;
  const scale = maxW / brand.naturalWidth;
  const logoW = brand.naturalWidth * scale;
  const logoH = brand.naturalHeight * scale;

  ctx.drawImage(brand, (W - logoW) / 2, 40, logoW, logoH);

  // Text
  ctx.textAlign = "center";
  ctx.fillStyle = color;

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

  // Title text
  ctx.font = "bold 52px Arial";
  if (outline) ctx.strokeText(title, W / 2, 200);
  ctx.fillText(title, W / 2, 200);

  // Contest details auto-shrink
  let fontSize = 52;
  let lines = wrap(details, fontSize);

  while (lines.length > 2 && fontSize > 26) {
    fontSize -= 2;
    lines = wrap(details, fontSize);
  }

  ctx.font = `bold ${fontSize}px Arial`;
  lines.forEach((ln, i) => {
    const y = 300 + i * (fontSize + 8);
    if (outline) ctx.strokeText(ln, W / 2, y);
    ctx.fillText(ln, W / 2, y);
  });

  // QR Code
  const qrData = await QRCode.toDataURL(url);
  const qrImg = new Image();
  qrImg.src = qrData;
  await qrImg.decode();

  ctx.shadowColor = "transparent";
  ctx.drawImage(qrImg, W / 2 - 150, 420, 300, 300);

  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "black";
  ctx.fillText("Scan to Enter", W / 2, 750);
}

// Text wrap helper
function wrap(text, size) {
  ctx.font = `bold ${size}px Arial`;
  const words = text.split(" ");
  const lines = [];
  let line = "";
  words.forEach(w => {
    const test = line + w + " ";
    if (ctx.measureText(test).width > 800) {
      lines.push(line);
      line = w + " ";
    } else {
      line = test;
    }
  });
  lines.push(line.trim());
  return lines;
}

// Live redraw
document.querySelectorAll("#flyerForm input, #flyerForm select, #flyerForm textarea")
  .forEach(el => el.addEventListener("input", drawFlyer));

// Reset
document.getElementById("resetBtn").addEventListener("click", () => {
  headerLogo.src = "eventflyerbuilder-logo.png";
  document.getElementById("flyerForm").reset();
  bgImage = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Download
document.getElementById("downloadBtn").addEventListener("click", async () => {
  await drawFlyer();
  const format = document.getElementById("downloadFormat").value;
  const filename = makeFilename(document.getElementById("eventName").value || "Flyer");

  if (format === "png") {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = filename + ".png";
    a.click();
  } else {
    const pdf = new jspdf.jsPDF("l", "pt", [canvas.width, canvas.height]);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0);
    pdf.save(filename + ".pdf");
  }
});
