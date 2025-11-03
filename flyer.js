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
    heading: "",
    eventInfo: "",
    disclaimer: DEFAULT_DISCLAIMER,
  };

  const cnv = document.getElementById("previewCanvas");
  const ctx = cnv.getContext("2d");

  const urlIn = document.getElementById("urlInput");
  const eventIn = document.getElementById("eventName");
  const headingIn = document.getElementById("headingInput");
  const infoIn = document.getElementById("eventInfoInput");
  const disclaimerIn = document.getElementById("disclaimerInput");
  const bgUpload = document.getElementById("bgUpload");
  const orientationInputs = document.querySelectorAll("input[name='orientation']");

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

  function getOrientationDims() {
    return state.orientation === "landscape" ? INCH_LANDSCAPE : INCH_PORTRAIT;
  }

  function drawText(ctx, text, x, y, size, weight = "normal", align = "center", color = "#1f1f23") {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
  }

  async function drawFlyer(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);

    // === Background image ===
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
    }

    // === Contest Entry Details (H1) ===
    const boxSize = Math.min(W, H) * 0.4;
    const h1FontSize = boxSize * 1.2 * 0.08;

    if (state.eventInfo) {
      drawText(ctx, state.eventInfo, W / 2, 40, h1FontSize, "900", "center", BRAND_COLOR);
    }

    // === QR Code Box ===
    const boxX = (W - boxSize) / 2;
    const boxY = (H - boxSize) / 2;

    // "Scan to Enter" - just above QR
    drawText(ctx, "Scan to Enter", W / 2, boxY - 26, 18, "bold");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(boxX, boxY, boxSize, boxSize);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

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

    // === Footer Disclaimer ===
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

  // === Debounced preview update ===
  let previewTimer;
  function scheduleRender() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      state.url = urlIn.value.trim() || "https://www.sparklight.com/internet";
      state.eventName = eventIn.value.trim() || "Event";
      state.heading = headingIn.value.trim();
      state.eventInfo = infoIn.value.trim();
      state.disclaimer = disclaimerIn.value.trim() || DEFAULT_DISCLAIMER;

      const selected = [...orientationInputs].find(r => r.checked);
      state.orientation = selected?.value || "portrait";

      renderPreview();
    }, 200);
  }

  // === Live preview listeners ===
  [urlIn, eventIn, headingIn, infoIn, disclaimerIn].forEach(input => {
    input.addEventListener("input", scheduleRender);
  });
  orientationInputs.forEach(radio => {
    radio.addEventListener("change", scheduleRender);
  });

  // === Background upload ===
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
