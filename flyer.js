(() => {
  const DPI = 300;
  const INCH_PORTRAIT = { w: 8.5, h: 11 };
  const INCH_LANDSCAPE = { w: 11, h: 8.5 };

  const DEFAULT_DISCLAIMER =
    "No purchase necessary. Entry open to all eligible participants.\nScan QR Code to see full terms and conditions at the contest link.";

  const FONT_STACK = `"Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  const BRAND_COLOR = "#8d3b91";

  const state = {
    eventName: "Event",
    url: "https://www.sparklight.com/internet",
    orientation: "portrait",
    bgImage: null,
    eventInfo: "",
    disclaimer: DEFAULT_DISCLAIMER,
  };

  const cnv = document.getElementById("previewCanvas");
  const ctx = cnv.getContext("2d");

  const urlIn = document.getElementById("urlInput");
  const eventIn = document.getElementById("eventName");
  const infoIn = document.getElementById("eventInfoInput");
  const disclaimerIn = document.getElementById("disclaimerInput");
  const bgUpload = document.getElementById("bgUpload");
  const orientationInputs = document.querySelectorAll("input[name='orientation']");

  const saveBtn = document.getElementById("saveBtn");
  const resetBtn = document.getElementById("resetBtn");

  function toMLATitleCase(str) {
    const smallWords = new Set([
      "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor",
      "of", "on", "or", "so", "the", "to", "up", "yet"
    ]);

    return str
      .toLowerCase()
      .split(" ")
      .map((word, i, arr) => {
        if (smallWords.has(word) && i !== 0 && i !== arr.length - 1) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

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

  function getOrientationDims() {
    return state.orientation === "landscape" ? INCH_LANDSCAPE : INCH_PORTRAIT;
  }

  function drawWrappedText(ctx, text, maxWidth, x, y, lineHeight, style = {}) {
    const words = text.split(" ");
    let line = "";
    const lines = [];

    ctx.font = `${style.weight || "normal"} ${style.size || 16}px ${FONT_STACK}`;
    ctx.fillStyle = style.color || "#1f1f23";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(line);
        line = words[i] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + i * lineHeight);
    }
  }

  async function drawFlyer(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);

    // === White background ===
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // === Background image with 70% opacity ===
    if (state.bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.7;

      const footerFontSize = 10;
      const footerHeight = 3 * footerFontSize;
      const usableHeight = H - footerHeight;

      const imgAspect = state.bgImage.width / state.bgImage.height;
      const canvasAspect = W / usableHeight;

      let drawW, drawH;
      if (imgAspect > canvasAspect) {
        drawH = usableHeight;
        drawW = imgAspect * drawH;
      } else {
        drawW = W;
        drawH = drawW / imgAspect;
      }

      const offsetX = (W - drawW) / 2;
      const offsetY = (usableHeight - drawH) / 2;

      ctx.drawImage(state.bgImage, offsetX, offsetY, drawW, drawH);
      ctx.restore();

      // Feathered gradient
      const gradientHeight = H * 0.4;
      const grad = ctx.createLinearGradient(0, 0, 0, gradientHeight);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, gradientHeight);
    }

    const boxSize = Math.min(W, H) * 0.4;
    const qrSize = boxSize * 0.8;
    const qrPadding = qrSize * 0.1;

    const labelFontSize = qrSize * 0.12;
    const qrTotalHeight = qrSize + qrPadding * 2 + labelFontSize * 1.6;
    const boxX = (W - (qrSize + qrPadding * 2)) / 2;
    const boxY = (H - qrTotalHeight) / 2;

    // === Contest Entry Details ===
    if (state.eventInfo) {
      const formattedTitle = toMLATitleCase(state.eventInfo);
      const textSize = qrSize * 0.3;
      const topMargin = 60;
      const spaceAboveQR = boxY - topMargin;
      const textHeight = textSize * 1.2;
      const verticalCenter = topMargin + (spaceAboveQR - textHeight) / 2;

      drawWrappedText(ctx, formattedTitle, qrSize * 2.5, W / 2, verticalCenter, textSize * 1.2, {
        size: textSize,
        weight: "900",
        color: BRAND_COLOR
      });
    }

    // === QR Code Box with "Scan to Enter" inside ===
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(boxX, boxY, qrSize + qrPadding * 2, qrTotalHeight);

    const qrX = boxX + qrPadding;
    const qrY = boxY + qrPadding;

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

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    ctx.font = `bold ${labelFontSize}px ${FONT_STACK}`;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Scan to Enter", W / 2, qrY + qrSize + qrPadding * 0.5);

    // === Footer disclaimer ===
    const footerFontSize = 10;
    const footerHeight = 3 * footerFontSize;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, H - footerHeight, W, footerHeight);

    ctx.font = `italic ${footerFontSize}px ${FONT_STACK}`;
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.disclaimer, W / 2, H - footerHeight / 2);
  }

  async function renderPreview() {
    const dims = getOrientationDims();
    const stage = document.getElementById("preview-stage");

    stage.style.aspectRatio = `${dims.w} / ${dims.h}`;

    const cssW = stage.clientWidth;
    const cssH = cssW * (dims.h / dims.w);
    const dpr = window.devicePixelRatio || 1;

    cnv.width = Math.round(cssW * dpr);
    cnv.height = Math.round(cssH * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    await drawFlyer(ctx, cssW, cssH);
  }

  async function savePDF() {
    const dims = getOrientationDims();
    const pxW = Math.round(dims.w * DPI);
    const pxH = Math.round(dims.h * DPI);

    const offCanvas = document.createElement("canvas");
    offCanvas.width = pxW;
    offCanvas.height = pxH;
    const offCtx = offCanvas.getContext("2d");

    await drawFlyer(offCtx, pxW, pxH);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF(state.orientation === "landscape" ? "l" : "p", "in", [dims.w, dims.h]);
    pdf.addImage(offCanvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, dims.w, dims.h);
    pdf.save(sanitizeFilename(state.eventName) + ".pdf");
  }

  let previewTimer;
  function scheduleRender() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      state.url = urlIn.value.trim() || "https://www.sparklight.com/internet";
      state.eventName = eventIn.value.trim() || "Event";
      state.eventInfo = infoIn.value.trim();
      state.disclaimer = disclaimerIn.value.trim() || DEFAULT_DISCLAIMER;

      const selected = [...orientationInputs].find(r => r.checked);
      state.orientation = selected?.value || "portrait";

      renderPreview();
    }, 200);
  }

  [urlIn, eventIn, infoIn, disclaimerIn].forEach(input => {
    input.addEventListener("input", scheduleRender);
  });
  orientationInputs.forEach(radio => {
    radio.addEventListener("change", scheduleRender);
  });

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

  saveBtn.addEventListener("click", savePDF);
  resetBtn.addEventListener("click", () => location.reload());

  window.addEventListener("resize", () => {
    clearTimeout(renderPreview._t);
    renderPreview._t = setTimeout(renderPreview, 100);
  });

  renderPreview();
})();
