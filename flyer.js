const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");
const headerLogo = document.getElementById("headerLogo");

// Mobile: change label
const bgLabel = document.getElementById("bgLabel");
if (/Mobi|Android/i.test(navigator.userAgent)) {
  bgLabel.textContent = "Background Image (Choose a File or Take a Photo)";
}

/* MLA Title Case with acronym protection */
function toMLATitleCase(text) {
  const alwaysCap = ["TV", "USA", "UK", "HD", "4K"];
  return text.split(" ").map(word => {
    if (alwaysCap.includes(word.toUpperCase())) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

/* Filename generator */
function makeFilename(eventName) {
  const now = new Date();
  const mon = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][now.getMonth()];
  const yr = now.getFullYear().toString().slice(-2);
  return `${eventName.replace(/\s+/g, "_")}_${mon}${yr}`;
}

/* Draw Flyer */
async function drawFlyer() {

  headerLogo.src = "eventflyerbuilder-done.png";

  let W = 1100;
  let H = 850;

  const orient = document.querySelector("input[name='orient']:checked").value;
  if (orient === "portrait") {
    W = 850;
    H = 1100;
  }

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

  // Draw Sparklight Logo
  const brandLogo = new Image();
  brandLogo.src = "sparklight-logo.png";
  await brandLogo.decode();
  ctx.drawImage(brandLogo, W/2 - 150, 40, 300, 80);

  // Main title
  ctx.textAlign = "center";
  ctx.font = "bold 48px Arial";
  ctx.fillStyle = textColor;

  ctx.shadowColor = shadow ? "rgba(0,0,0,0.4)" : "transparent";
  ctx.shadowBlur = shadow ? 6 : 0;
  ctx.shadowOffsetX = shadow ? 3 : 0;
  ctx.shadowOffsetY = shadow ? 3 : 0;

  if (outline) {
    ctx.lineWidth = 6;
    ctx.strokeStyle = "white";
  }

  const titleText = toMLATitleCase(eventName);
  if (outline) ctx.strokeText(titleText, W/2, 180);
  ctx.fillText(titleText, W/2, 180);

  // Contest Details (2 lines max)
  let fontSize = 42;
  let lines = wrapText(contestDetails, fontSize);
  while (lines.length > 2 && fontSize > 20) {
    fontSize -= 2;
    lines = wrapText(contestDetails, fontSize);
  }

  ctx.font = `bold ${fontSize}px Arial`;

  lines.forEach((line, i) => {
    const yPos = 260 + i * (fontSize + 10);
    if (outline) ctx.strokeText(line, W/2, yPos);
    ctx.fillText(line, W/2, yPos);
  });

  // QR Code
  const QR = await QRCode.toDataURL(url);
  const qrImg = new Image();
  qrImg.src = QR;
  await qrImg.decode();

  ctx.drawImage(qrImg, W/2 - 150, 350, 300, 300);
  ctx.shadowColor = "transparent";
  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "black";
  ctx.fillText("Scan to Enter", W/2, 690);
}

/* Wrap text */
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

/* Listeners */
document.querySelectorAll("#flyerForm input, #flyerForm select, #flyerForm textarea")
  .forEach(el => el.addEventListener("input", drawFlyer));

document.getElementById("resetBtn").addEventListener("click", () => {
  headerLogo.src = "eventflyerbuilder-logo.png";
  document.getElementById("flyerForm").reset();
  drawFlyer();
});

document.getElementById("downloadBtn").addEventListener("click", async () => {
  await drawFlyer();

  const fmt = document.getElementById("downloadFormat").value;
  const name = makeFilename(document.getElementById("eventName").value || "Flyer");

  if (fmt === "png") {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${name}.png`;
    a.click();
  } else {
    const pdf = new jspdf.jsPDF("l", "pt", [canvas.width, canvas.height]);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0);
    pdf.save(`${name}.pdf`);
  }
});
