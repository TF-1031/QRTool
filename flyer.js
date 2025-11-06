// ————— helpers —————
const $ = (sel) => document.querySelector(sel);
const canvas = $("#flyerCanvas");
const ctx = canvas.getContext("2d");
const headerLogo = $("#headerLogo");

// Mobile hint for camera
if (/Mobi|Android/i.test(navigator.userAgent)) {
  $("#bgLabel").textContent = "Background Image (Choose File or Take Photo)";
}

// MLA style with acronym protection; we do NOT print Event Name on canvas
function toMLATitleCase(str){
  if(!str) return "";
  const keep = new Set(["TV","USA","HD","4K","Wi-Fi","Wi-Fi"]);
  return str.split(/\s+/).map((w,i,arr)=>{
    if(keep.has(w.toUpperCase())) return w.toUpperCase();
    const small = new Set(["a","an","and","as","at","but","by","for","in","nor","of","on","or","so","the","to","up","yet","with"]);
    const lw = w.toLowerCase();
    if(i!==0 && i!==arr.length-1 && small.has(lw)) return lw;
    return lw.charAt(0).toUpperCase()+lw.slice(1);
  }).join(" ");
}

function monthStamp(){
  const m = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const d = new Date();
  return m[d.getMonth()] + d.getFullYear().toString().slice(-2);
}
function filenameFromEvent(){
  const raw = $("#eventName").value.trim() || "Flyer";
  return raw.replace(/\s+/g,"_") + "_" + monthStamp();
}

// text wrap helper using current ctx font
function wrapLines(text, maxW){
  const words = (text||"").split(/\s+/);
  const lines = [];
  let line = "";
  for(const w of words){
    const test = (line? line+" " : "") + w;
    if(ctx.measureText(test).width > maxW && line){
      lines.push(line);
      line = w;
    }else{
      line = test;
    }
  }
  if(line) lines.push(line);
  return lines;
}

// draw image cover
function drawImageCover(img, W, H){
  const iw = img.width, ih = img.height;
  const s = Math.max(W/iw, H/ih);
  const dw = iw*s, dh = ih*s;
  const dx = (W-dw)/2, dy = (H-dh)/2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

// ————— main draw —————
async function drawFlyer(){
  // swap header to “done” whenever user interacts
  headerLogo.src = "eventflyerbuilder-done.png";

  const orient = document.querySelector("input[name='orient']:checked")?.value || "landscape";
  const W = orient === "portrait" ? 850 : 1100;
  const H = orient === "portrait" ? 1100 : 850;
  canvas.width = W; canvas.height = H;

  // base white
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,W,H);

  // state from form
  const detailsRaw = $("#contestDetails").value.trim();
  const details = toMLATitleCase(detailsRaw);
  const url = $("#contestURL").value.trim();
  const color = $("#textColorSelect").value;
  const useOutline = $("#effectOutline").checked;
  const useShadow  = $("#effectShadow").checked;

  // background image (optional)
  const file = $("#imageUpload").files[0];
  if(file){
    const bg = new Image();
    bg.src = URL.createObjectURL(file);
    await bg.decode();
    drawImageCover(bg, W, H);

    // gradient wash — top -> down (75% → 0%), only over image
    const washH = H * 0.45;
    const grad = ctx.createLinearGradient(0,0,0,washH);
    grad.addColorStop(0,"rgba(255,255,255,0.75)");
    grad.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,washH);
  }

  // brand logo (PNG, crisp, not squashed)
  const brand = new Image();
  brand.src = "sparklight-logo.png";
  await brand.decode();
  const LOGO_W = Math.min(360, W*0.32);
  const LOGO_H = brand.height/brand.width * LOGO_W;
  const LOGO_X = (W-LOGO_W)/2;
  const LOGO_Y = 70;
  ctx.drawImage(brand, LOGO_X, LOGO_Y, LOGO_W, LOGO_H);
  const logoBottom = LOGO_Y + LOGO_H;

  // text effects
  ctx.textAlign = "center";
  if(useShadow){
    ctx.shadowColor = "rgba(0,0,0,0.38)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
  }else{
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // contest details: start BIG, shrink to 2 lines max
  let fontSize = orient === "portrait" ? 64 : 60;
  const maxWidth = W * 0.78;
  let lines;
  do{
    ctx.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
    lines = wrapLines(details, maxWidth);
    if(lines.length>2) fontSize -= 2;
  }while(lines.length>2 && fontSize>26);

  const lineGap = Math.round(fontSize*0.22);
  const textTop = logoBottom + 40;
  ctx.fillStyle = color;

  if(useOutline){
    ctx.lineWidth = Math.max(4, Math.round(fontSize*0.11));
    ctx.strokeStyle = "#ffffff";
    lines.forEach((ln,i)=> ctx.strokeText(ln, W/2, textTop + i*(fontSize+lineGap)));
  }
  lines.forEach((ln,i)=> ctx.fillText(ln, W/2, textTop + i*(fontSize+lineGap)));
  const textBottom = textTop + (lines.length-1)*(fontSize+lineGap);

  // QR code block — visually centered lower, not glued to bottom
  const qrSize = Math.round(Math.min(W,H) * 0.27);  // ~300 on 1100×850
  const qrY = Math.max(textBottom + 40, Math.round(H*0.50 - qrSize*0.10));
  const qrDataURL = await QRCode.toDataURL(url, {width: qrSize, margin:0, errorCorrectionLevel:"Q"});
  const qrImg = new Image();
  qrImg.src = qrDataURL;
  await qrImg.decode();
  ctx.drawImage(qrImg, (W-qrSize)/2, qrY, qrSize, qrSize);

  // Scan to Enter — same color as details, constant size
  ctx.shadowColor = "transparent";
  ctx.fillStyle = color;
  ctx.font = "700 26px Arial, Helvetica, sans-serif";
  ctx.fillText("Scan to Enter", W/2, qrY + qrSize + 40);
}

// listeners
function reDraw(){ drawFlyer(); headerLogo.src = "eventflyerbuilder-done.png"; }
document.querySelectorAll("#flyerForm input, #flyerForm select, #flyerForm textarea")
  .forEach(el => el.addEventListener("input", reDraw));

$("#resetBtn").addEventListener("click", ()=>{
  $("#flyerForm").reset();
  headerLogo.src = "eventflyerbuilder-logo.png";
  drawFlyer();
});

$("#downloadBtn").addEventListener("click", async ()=>{
  await drawFlyer();
  const fmt = $("#downloadFormat").value;
  const name = filenameFromEvent();

  if(fmt === "png"){
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${name}.png`;
    a.click();
  }else{
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF(
      (document.querySelector("input[name='orient']:checked")?.value || "landscape") === "portrait" ? "p" : "l",
      "pt",
      [canvas.width, canvas.height]
    );
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${name}.pdf`);
  }
});

// initial paint
drawFlyer();
