(() => {
  const DPI = 300;
  const INCH_W = 8.5, INCH_H = 11;
  const DEFAULT_DISCLAIMER =
    "No purchase necessary. Entry open to all eligible participants.\nScan QR Code to see full terms and conditions at the contest link.";

  const FONT_STACK = `"Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

  const state = {
    eventName: "Event",
    url: "https://your-url.com",
    orientation: "portrait",
    bgImage: null,
    heading: "",
    eventInfo: "",
    disclaimer: DEFAULT_DISCLAIMER,
  };

  const cnv = document.getElementById("previewCanvas");
  const ctx = cnv.getContext("2d");

  const eventIn = document.getElementById("eventName");
  const urlIn = document.getElementById("urlInput");
  const orientationIn = document.getElementById("orientation");
  const headingIn = document.getElementById("headingInput");
  const infoIn = document.getElementById("eventInfoInput");
  const disclaimerIn = document.getElementById("disclaimerInput");
  const bgUpload = document.getElementById("bgUpload");

  const makeQR = document.getElementById("makeQR");
  const saveBtn = document.getElementById("saveBtn");
  const resetBtn = document.getElementById("resetBtn");

  function sanitizeFilename(name) {
    return (name || "Event")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function drawText(ctx, text, x, y, size, weight = "normal", align = "center") {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    ctx.fillStyle = "#1f1f23";
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '', lines = [], testLine = '', metrics;
    
    for (let i = 0; i < words.length; i++) {
      testLine = line + words[i] + ' ';
      metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(line.trim());
        line = words[i] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    lines.forEach((l, i) => {
      ctx.fillText(l, x, y + i * lineHeight);
    });
  }

  async function drawFlyer(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);

    // Draw background image (covering the canvas minus 10px white footer)
    if (state.bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.7;

      const disclaimerHeight = 10;
      const targetH = H - disclaimerHeight;

      const imgAspect = state.bgImage.width / state.bgImage.height;
      const canvasAspect = W / targetH;

      let drawW, drawH;
      if (imgAspect > canvasAspect) {
        drawH = targetH;
        drawW = imgAspect * drawH;
      } else {
        drawW = W;
        drawH = drawW / imgAspect;
      }

      const offsetX = (W - drawW) / 2;
      const offsetY = (targetH - drawH) / 2;

      ctx.drawImage(state.bgImage, offsetX, offsetY, drawW, drawH);
      ctx.restore();
    }

    // Set text baseline
    ctx.textBaseline = "top";

    // Compute QR box size
    const boxSize = Math.min(W, H) * 0.4;
    const boxX = (W - boxSize) / 2;
    const boxY = (H - boxSize) / 2;

    // H1 (Event Info) - 120% of QR box height
    const h1Size = boxSize * 1.2;
    if (state.eventInfo) {
      drawText(ctx, state.eventInfo, W / 2, 40, h1Size * 0.08, "bold");
    } else {
      drawText(ctx, "Scan to Enter", W / 2, 40, h1Size * 0.08, "normal");
    }

    // Subheading if event info provided
    if (state.eventInfo) {
      drawText(ctx, "Scan to Enter", W / 2, 60 + h1Size * 0.08, 16, "normal");
    }

    // White QR box
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(boxX, boxY, boxSize, boxSize);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    // QR code
    const qrSize = boxSize * 0.92;
    const qrPad = (boxSize - qrSize) / 2;

    const qrDataURL = await QRCode.toDataURL(state.url, {
      width: Math.round(qrSize),
      margin: 0,
      color: { dark: "#000000", light: "#ffffff" }
    });

    const qrImg = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = qrDataURL;
    });

    ctx.drawImage(qrImg, boxX + qrPad, boxY + qrPad, qrSize, qrSize);

    // Footer disclaimer box
    const footerHeight = 10;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, H - footerHeight, W, footerHeight);

    ctx.font = `italic 10px ${FONT_STACK}`;
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.disclaimer, W / 2, H - footerHeight / 2);
  }

  async function renderPreview() {
    const stage = document.getElementById("preview-stage");
    const cssW = stage.clientWidth;
    const cssH = stage.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    cnv.width = Math.round(cssW * dpr);
    cnv.height = Math.round(cssH * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    await drawFlyer(ctx, cssW, cssH);
  }

  async function savePDF() {
    const orientation = state.orientation === "landscape" ? "l" : "p";
    const pdfW = orientation === "l" ? INCH_H : INCH_W;
    const pdfH = orientation === "l" ? INCH_W : INCH_H;

    const pxW = Math.round(pdfW * DPI);
    const pxH = Math.round(pdfH * DPI);

    const offCanvas = document.createElement("canvas");
    offCanvas.width = pxW;
    offCanvas.height = pxH;
    const offCtx = offCanvas.getContext("2d");

    await drawFlyer(offCtx, pxW, pxH);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF(orientation, "in", [pdfW, pdfH]);
    pdf.addImage(offCanvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, pdfW, pdfH);
    pdf.save(sanitizeFilename(state.eventName) + ".pdf");
  }

  makeQR.addEventListener("click", async () => {
    state.eventName = eventIn.value.trim() || "Event";
    state.url = urlIn.value.trim() || "https://your-url.com";
    state.orientation = orientationIn.value;
    state.heading = headingIn.value.trim();
    state.eventInfo = infoIn.value.trim();
    state.disclaimer = disclaimerIn.value.trim() || DEFAULT_DISCLAIMER;

    await renderPreview();
  });

  saveBtn.addEventListener("click", savePDF);
  resetBtn.addEventListener("click", () => location.reload());

  bgUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        state.bgImage = await loadImageFromFile(file);
        await renderPreview();
      } catch (err) {
        alert("Failed to load image");
      }
    }
  });

  window.addEventListener("resize", () => {
    clearTimeout(renderPreview._t);
    renderPreview._t = setTimeout(renderPreview, 100);
  });

  renderPreview();
})();
