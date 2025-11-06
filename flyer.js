// Elements
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

let bgImage = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {

  if (/Mobi|Android/i.test(navigator.userAgent)) {
    document.getElementById("bgLabel").textContent =
      "Background Image (Choose File or Take a Photo)";
  }

  document.querySelectorAll("#flyerForm input, #flyerForm select, #flyerForm textarea")
    .forEach(el => el.addEventListener("input", () => {
      headerLogo.src = "eventflyerbuilder-done.png";
      drawFlyer();
    }));

  orientEls.forEach(r => r.addEventListener("change", drawFlyer));
  imageInput.addEventListener("change", onImageUpload);
  downloadBtn.addEventListener("click", handleDownload);
  resetBtn.addEventListener("click", handleReset);

  drawFlyer();
});

// Title case with acronym support
function toMLATitleCase(text){
  const always = ["TV","USA","UK","HD","4K","UHD"];
  return text.split(/\s+/).map(w=>{
    if (always.includes(w.toUpperCase())) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

// Filename like NOV25
function makeFilename(name){
  const now = new Date();
  const mons = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const tag  = `${mons[now.getMonth()]}${String(now.getFullYear()).slice(-2)}`;
  return (name.trim() || "Flyer").replace(/\s+/g,"_") + "_" + tag;
}

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

function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

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

async function drawFlyer(){

  // Orientation
  const orient = document.querySelector("input[name='orient']:checked").value;
  const W = (orient === "portrait") ? 850 : 1100;
  const H = (orient === "portrait") ? 1100 : 850;
  canvas.width = W;
  canvas.height = H;

  // White base
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0,0,W,H);

  // Background image
  if (bgImage){
    const scale = Math.max(W/bgImage.naturalWidth, H/bgImage.naturalHeight);
    const bw = bgImage.naturalWidth * scale;
    const bh = bgImage.naturalHeight * scale;
    const bx = (W - bw)/2;
    const by = (H - bh)/2;
    ctx.drawImage(bgImage, bx, by, bw, bh);
  }

  // Wash ON TOP of background, BEFORE text
  const washHeight = Math.min(0.45 * H, 360);
  const grad = ctx.createLinearGradient(0,0,0,washHeight);
  grad.addColorStop(0,"rgba(255,255,255,0.93)");
  grad.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,washHeight);

  // Sparklight logo
  const brand = await loadImage("sparklight-logo.png");
  const maxLogoW = Math.min(260, W * 0.26);
  const scale = maxLogoW / brand.naturalWidth;
  const logoW = brand.naturalWidth * scale;
  const logoH = brand.naturalHeight * scale;
  const logoX = (W - logoW)/2;
  const logoY = 40;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(brand, logoX, logoY, logoW, logoH);
  const logoBottom = logoY + logoH;

  // Inputs
  const detailsRaw = detailsEl.value.trim();
  const details    = toMLATitleCase(detailsRaw);
  const url        = urlEl.value.trim() || "https://www.sparklight.com/internet";
  const textColor  = colorEl.value;
  const outline    = outlineEl.checked;
  const shadow     = shadowEl.checked;

  // Text style
  ctx.textAlign = "center";
  if (shadow){
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
  } else {
    ctx.shadowColor = "transparent";
  }
  if (outline){
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#FFFFFF";
  }

  // Headline text (Contest Entry Details)
  let fontSize = 64;
  const maxWidth = Math.min(0.78 * W, 800);
  let lines = wrapText(details, fontSize, maxWidth);

  while (lines.length > 2 && fontSize > 26){
    fontSize -= 2;
    lines = wrapText(details, fontSize, maxWidth);
  }

  const lineGap = 10;
  const blockH = lines.length * (fontSize + lineGap) - lineGap;

  // Visually balanced zone (slightly lower)
  const headerTop = 20;
  const headerBottom = logoBottom - 30;
  const headerHeight = headerBottom - headerTop;
  let headlineTop = headerTop + (headerHeight - blockH) * 0.60;

  if (headlineTop < 30) headlineTop = 30;
  if (headlineTop + blockH > logoBottom - 20){
    headlineTop = logoBottom - 20 - blockH;
  }

  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = textColor;

  lines.forEach((line, i)=>{
    const y = headlineTop + i*(fontSize + lineGap);
    if (outline) ctx.strokeText(line, W/2, y);
    ctx.fillText(line, W/2, y);
  });

  // QR Code
  const qrSize = Math.min(300, W*0.27);
  const qrDataURL = await QRCode.toDataURL(url);
  const qrImg = await loadImage(qrDataURL);

  const qrTop = Math.max(logoBottom + 40, headlineTop + blockH + 40, H * 0.40);
  ctx.shadowColor = "transparent";
  ctx.drawImage(qrImg, (W-qrSize)/2, qrTop, qrSize, qrSize);

  // Scan to Enter
  ctx.font = "bold 24px Arial";
  ctx.fillStyle = textColor;
  ctx.fillText("Scan to Enter", W/2, qrTop+qrSize+30);
}

async function handleDownload(){
  await drawFlyer();

  const format = document.getElementById("downloadFormat").value;
  const fname = makeFilename(eventNameEl.value);

  if (format === "png"){
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${fname}.png`;
    a.click();
  } else {
    const pdf = new jspdf.jsPDF(
      (document.querySelector("input[name='orient']:checked").value === "portrait") ? "p" : "l",
      "pt",
      [canvas.width, canvas.height]
    );
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${fname}.pdf`);
  }
}

function handleReset(){
  document.getElementById("flyerForm").reset();
  headerLogo.src = "eventflyerbuilder-logo.png";
  bgImage = null;
  drawFlyer();
}
