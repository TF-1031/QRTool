const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

// Mobile camera input label
const bgLabel = document.getElementById("bgLabel");
if (/Mobi|Android/i.test(navigator.userAgent)) {
  bgLabel.textContent = "Background Image (Choose File or Take Photo)";
}

// Filename builder
function makeFilename(eventName) {
  const now = new Date();
  const mon = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][now.getMonth()];
  const yr = now.getFullYear().toString().slice(-2);
  return `${eventName.replace(/\s+/g,"_") || "Flyer"}_${mon}${yr}`;
}

// Draw function
async function drawFlyer() {
  const orient = document.querySelector("input[name='orient']:checked").value;

  const W = orient === "portrait" ? 850 : 1100;
  const H = orient === "portrait" ? 1100 : 850;

  canvas.width = W;
  canvas.height = H;

  // ==== Pull fields ====
  const details = document.getElementById("contestDetails").value.trim();
  const url = document.getElementById("contestURL").value.trim();
  const textColor = document.getElementById("textColorSelect").value;
  const outline = document.getElementById("effectOutline").checked;
  const shadow = document.getElementById("effectShadow").checked;
  const fileInput = document.getElementById("imageUpload").files[0];

  // ==== Background fill ====
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // ==== Draw uploaded background ====
  if (fileInput) {
    const img = new Image();
    img.src = URL.createObjectURL(fileInput);
    await img.decode();

    ctx.drawImage(img, 0, 0, W, H);

    // Gradient wash — TOP white → transparent
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    grad.addColorStop(0, "rgba(255,255,255,0.75)");
    grad.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.45);
  }

  // ==== Sparklight Logo ====
  const logo = new Image();
  logo.src = "sparklight-logo.png";
  await logo.decode();

  const LOGO_W = 350;
  const LOGO_H = (logo.height / logo.width) * LOGO_W;

  ctx.drawImage(logo, W/2 - LOGO_W/2, 80, LOGO_W, LOGO_H);

  const logoBottom = 80 + LOGO_H;

  // ==== Contest Entry Details ====
  ctx.textAlign = "center";
  ctx.fillStyle = textColor;

  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
  } else {
    ctx.shadowColor = "transparent";
  }

  let fontSize = 56;
  ctx.font = `bold ${fontSize}px Arial`;

  let lines = wrap(details, W * 0.75);

  while (lines.length > 2 && fontSize > 26) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px Arial`;
    lines = wrap(details, W * 0.75);
  }

  const textStart = logoBottom + 40;

  if (outline) {
    ctx.lineWidth = 6;
    ctx.strokeStyle = "white";
    lines.forEach((line, i) =>
      ctx.strokeText(line, W/2, textStart + i * (fontSize + 12))
    );
  }

  lines.forEach((line, i) =>
    ctx.fillText(line, W/2, textStart + i * (fontSize + 12))
  );

  const textBottom = textStart + lines.length * (fontSize + 12);

  // ==== QR CODE ====
  const QR = await QRCode.toDataURL(url);
  const qrImg = new Image();
  qrImg.src = QR;
  await qrImg.decode();

  const QR_SIZE = 280;
  const qrY = textBottom + 40;

  ctx.drawImage(qrImg, W/2 - QR_SIZE/2, qrY, QR_SIZE, QR_SIZE);

  // ==== Scan To Enter ====
  ctx.shadowColor = "transparent";
  ctx.fillStyle = textColor;
  ctx.font = "bold 26px Arial";
  ctx.fillText("Scan to Enter", W/2, qrY + QR_SIZE + 40);
}

// Wrap helper
function wrap(text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  words.forEach(word => {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line = test;
    }
  });

  if (line.trim()) lines.push(line.trim());
  return lines;
}

// Form listeners
document.querySelectorAll("#flyerForm input, #flyerForm select, #flyerForm textarea")
  .forEach(el => el.addEventListener("input", drawFlyer));

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("flyerForm").reset();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById("downloadBtn").addEventListener("click", async () => {
  await drawFlyer();
  const fmt = document.getElementById("downloadFormat").value;
  const filename = makeFilename(document.getElementById("eventName").value);

  if (fmt === "png") {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${filename}.png`;
    link.click();
  } else {
    const pdf = new jspdf.jsPDF("l", "pt", [canvas.width, canvas.height]);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0);
    pdf.save(`${filename}.pdf`);
  }
});

// Initial draw
drawFlyer();
