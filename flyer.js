// ===== Elements
const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");
const headerLogo = document.getElementById("headerLogo");

const eventNameEl = document.getElementById("eventName");
const detailsEl   = document.getElementById("contestDetails");
const urlEl       = document.getElementById("contestURL");
const colorEl     = document.getElementById("textColorSelect");
const outlineEl   = document.getElementById("effectOutline");
const shadowEl    = document.getElementById("effectShadow");
const orientEls   = document.querySelectorAll("input[name='orient']");
const imageInput  = document.getElementById("imageUpload");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn    = document.getElementById("resetBtn");

// ===== State
let bgImage = null;               // background image (optional)

document.addEventListener("DOMContentLoaded", () => {
  // Mobile hint on label
  if (/Mobi|Android/i.test(navigator.userAgent)) {
    document.getElementById("bgLabel").textContent =
      "Background Image (Choose File or Take a Photo)";
  }

  // Wire inputs
  document.querySelectorAll("#flyerForm input, #flyerForm select, #flyerForm textarea")
    .forEach(el => el.addEventListener("input", () => {
      // Swap header once user starts editing
      headerLogo.src = "eventflyerbuilder-done.png";
      drawFlyer();
    }));

  orientEls.forEach(r => r.addEventListener("change", drawFlyer));

  imageInput.addEventListener("change", onImageUpload);
  downloadBtn.addEventListener("click", handleDownload);
  resetBtn.addEventListener("click", handleReset);

  // Initial render in whichever radio is checked
  drawFlyer();
});

// ===== Title case (MLA with acronym protection)
function toMLATitleCase(text){
  const always = ["TV","USA","UK","HD","4K","UHD"];
  return text.split(/\s+/).map(w=>{
    if (always.includes(w.toUpperCase())) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

// ===== Filename like MAR25
function makeFilename(name){
  const now = new Date();
  const mons = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const tag  = `${mons[now.getMonth()]}${String(now.getFullYear()).slice(-2)}`;
  return (name.trim() || "Flyer").replace(/\s+/g,"_") + "_" + tag;
}

// ===== Image upload
function onImageUpload(e){
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => { bgImage = img; drawFlyer(); };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// ===== Word wrap helper for a fixed content width
function wrapText(text, fontSize, maxWidth){
  ctx.font = `bold ${fontSize}px Arial`;
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words){
    const test = (line + w + " ");
    if (ctx.measureText(test).width > maxWidth){
      lines.push(line.trim());
      line = w + " ";
    } else {
      line = test;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

// ===== Draw flyer (auto-sizes to orientation)
async function drawFlyer(){
  // Dimensions by orientation (default = checked radio)
  const orient = document.querySelector("input[name='orient']:checked").value;
  const W = (orient === "portrait") ? 850 : 1100;
  const H = (orient === "portrait") ? 1100 : 850;

  canvas.width = W;
  canvas.height = H;

  // White canvas background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0,0,W,H);

  // Background image, if present (cover fully)
  if (bgImage){
    const scale = Math.max(W / bgImage.naturalWidth, H / bgImage.naturalHeight);
    const bw = bgImage.naturalWidth * scale;
    const bh = bgImage.naturalHeight * scale;
    const bx = (W - bw) / 2;
    const by = (H - bh) / 2;
    ctx.drawImage(bgImage, bx, by, bw, bh);

    // Top gradient wash to keep header/text readable
    const grad = ctx.createLinearGradient(0,0,0,Math.min(0.45*H,360));
    grad.addColorStop(0,"rgba(255,255,255,0.92)");
    grad.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,Math.min(0.45*H,360));
  }

  // Sparklight logo: draw PNG crisp with natural aspect ratio
  const brand = await loadImage("sparklight-logo.png");
  const maxLogoW = Math.min(260, W * 0.26);
  const scale = maxLogoW / brand.naturalWidth;
  const logoW = brand.naturalWidth * scale;
  const logoH = brand.naturalHeight * scale;
  const logoX = (W - logoW)/2;
  const logoY = 40;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(brand, logoX, logoY, logoW, logoH);

  // Read values
  const titleRaw   = eventNameEl.value.trim();
  const detailsRaw = detailsEl.value.trim();
  const url        = (urlEl.value.trim() || "https://www.sparklight.com/internet");
  const color      = colorEl.value;
  const outline    = outlineEl.checked;
  const shadow     = shadowEl.checked;

  // Text setup
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  if (shadow){
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  if (outline){
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#FFFFFF";
  }

  // Title (MLA with acronym protection)
  const title = toMLATitleCase(titleRaw);
  ctx.font = "bold 52px Arial";
  const titleY = logoY + logoH + 60;
  if (outline) ctx.strokeText(title, W/2, titleY);
  ctx.fillText(title, W/2, titleY);

  // Contest details (start big and only shrink to keep ≤2 lines)
  let fontSize = 52;
  const detailsMaxWidth = Math.min(0.75*W, 800);
  let lines = wrapText(detailsRaw, fontSize, detailsMaxWidth);
  while (lines.length > 2 && fontSize > 26){
    fontSize -= 2;
    lines = wrapText(detailsRaw, fontSize, detailsMaxWidth);
  }
  ctx.font = `bold ${fontSize}px Arial`;
  const detailsTop = titleY + 40;
  lines.forEach((line, i) => {
    const y = detailsTop + i * (fontSize + 10);
    if (outline) ctx.strokeText(line, W/2, y);
    ctx.fillText(line, W/2, y);
  });

  // QR code
  const qrSize = Math.min(300, W*0.27);
  const qrDataURL = await QRCode.toDataURL(url);
  const qrImg = await loadImage(qrDataURL);
  const qrX = (W - qrSize)/2;
  const qrY = detailsTop + Math.max(1, lines.length) * (fontSize + 10) + 40;
  ctx.shadowColor = "transparent";
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Label
  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "#000000";
  ctx.fillText("Scan to Enter", W/2, qrY + qrSize + 30);
}

// helper image loader
function loadImage(src){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ===== Download
async function handleDownload(){
  await drawFlyer(); // ensure up-to-date
  const fmt = document.getElementById("downloadFormat").value;
  const name = makeFilename(eventNameEl.value || "Flyer");

  if (fmt === "png"){
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${name}.png`;
    a.click();
  } else {
    const pdf = new jspdf.jsPDF(
      (document.querySelector("input[name='orient']:checked").value === "portrait") ? "p" : "l",
      "pt",
      [canvas.width, canvas.height]
    );
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${name}.pdf`);
  }
}

// ===== Reset
function handleReset(){
  document.getElementById("flyerForm").reset();
  headerLogo.src = "eventflyerbuilder-logo.png";
  bgImage = null;
  drawFlyer(); // redraw with defaults
}
