const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

const headerLogo = document.getElementById("headerLogo");

// MOBILE: change background image label
const bgLabel = document.getElementById("bgLabel");
if (/Mobi|Android/i.test(navigator.userAgent)) {
  bgLabel.textContent = "Background Image (Choose a File or Take a Photo)";
}

// ---------------------------
// MLA-style Title Case WITH acronym protection
// ---------------------------
function toMLATitleCase(text) {
  const alwaysCap = ["TV", "USA", "UK", "HD", "4K"];
  return text
    .split(" ")
    .map(word => {
      if (alwaysCap.includes(word.toUpperCase())) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

// ---------------------------
// Filename generator
// ---------------------------
function makeFilename(eventName) {
  const now = new Date();
  const monthNames = [
    "JAN","FEB","MAR","APR","MAY","JUN",
    "JUL","AUG","SEP","OCT","NOV","DEC"
  ];

  const mon = monthNames[now.getMonth()];
  const yr = now.getFullYear().toString().slice(-2);

  return `${eventName.replace(/\s+/g, "_")}_${mon}${yr}`;
}

// ---------------------------
// Draw Flyer
// ---------------------------
async function drawFlyer() {

  // Header swap when user edits
  headerLogo.src = "eventflyerbuilder-done.png";

  const W = 1100;
  const H = 850;
  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);

  const eventName = document.getElementById("eventName").value.trim();
  const contestDetails = document.getElementById("contestDetails").value.trim();
  const url = document.getElementById("contestURL").value.trim();

  const textColor = document.getElementById("textColorSelect").value;
  const outline = document.getElementById("effectOutline").checked;
  const shadow = document.getElementById("effectShadow").checked;

  // ORIENTATION
  const orient = document.querySelector("input[name='orient']:checked").value;

  // Draw header logo in preview
  const brandLogo = new Image();
  brandLogo.src = "sparklight-logo.png";

  await brandLogo.decode();
  ctx.drawImage(brandLogo, W/2 - 150, 40, 300, 80);

  // TEXT EFFECTS
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.font = "bold 48px Arial";

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

  // Event Name in Title Case
  const titleText = toMLATitleCase(eventName);
  if (outline) ctx.strokeText(titleText, W/2, 180);
  ctx.fillText(titleText, W/2, 180);

  // Contest Details (wrapped, 2-line shrink)
  let fontSize = 42;
  ctx.font = `bold ${fontSize}px Arial`;

  const maxWidth = 800;
  let lines = wrapText(contestDetails, fontSize);

  while (lines.length > 2 && fontSize > 22) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px Arial`;
    lines = wrapText(contestDetails, fontSize);
  }

  lines.forEach((line, i) => {
    const yPos = 260 + i * (fontSize + 10);
    if (outline) ctx.strokeText(line, W/2, yPos);
    ctx.fillText(line, W/2, yPos);
  });

  // QR Code Section
  ctx.font = "bold 24px Arial";
  ctx.shadowColor = "transparent";

  const QR = await QRCode.toDataURL(url);
  const qrImg = new Image();
  qrImg.src = QR;
  await qrImg.decode();
  ctx.drawImage(qrImg, W/2 - 150, 350, 300, 300);

  ctx.fillStyle = "black";
  ctx.fillText("Scan to Enter", W/2, 690);
}

// ---------------------------
// Word wrap helper
// ---------------------------
function wrapText(text, size) {
  ctx.font = `bold ${size}px Arial`;
  const words = text.split(" ");
  const lines = [];
  let line = "";

  words.forEach(word => {
    const test = line + word + " ";
    if (ctx.measureText(test).width > 800) {
      lines.push(line);
      line = word + " ";
    } else {
      line = test;
    }
  });

  lines.push(line.trim());
  return lines;
}

// ---------------------------
// Event listeners
// ---------------------------
document.querySelectorAll("#flyerForm input, #flyerForm select, #flyerForm textarea")
  .forEach(el => el.addEventListener("input", drawFlyer));

document.getElementById("resetBtn").addEventListener("click", () => {
  headerLogo.src = "eventflyerbuilder-logo.png";
  document.getElementById("flyerForm").reset();
  ctx.clearRect(0,0,canvas.width,canvas.height);
});

document.getElementById("downloadBtn").addEventListener("click", async () => {
  await drawFlyer();

  const fmt = document.getElementById("downloadFormat").value;
  const name = makeFilename(document.getElementById("eventName").value || "Flyer");

  if (fmt === "png") {
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.png`;
    a.click();
  } else {
    const pdf = new jspdf.jsPDF("l", "pt", [canvas.width, canvas.height]);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0);
    pdf.save(`${name}.pdf`);
  }
});
