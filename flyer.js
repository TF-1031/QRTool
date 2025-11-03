(() => {
  const DPI = 300;
  const INCH_PORTRAIT = { w: 8.5, h: 11 };
  const INCH_LANDSCAPE = { w: 11, h: 8.5 };

  const DEFAULT_DISCLAIMER =
    "No purchase necessary. Entry open to all eligible participants.\nScan QR Code to see full terms and conditions at the contest link.";

  const FONT_STACK = `"Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

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

  function getOrientationDims() {
    return state.orientation === "landscape" ? INCH_LANDSCAPE : INCH_PORTRAIT;
  }

  async function drawFlyer(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);

    // Background image
    if (state.bgImage) {
      ctx.save();
      ctx.globalAlpha = 0.7;

      const footerHeight = 10;
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

    // H1 Event Info
    ctx.textBaseline = "top";
    const boxSize = Math.min(W, H) * 0.4;
    const h1FontSize = boxSize * 1.2 * 0.08;

    if (state.eventInfo) {
      ctx.font = `bold ${h1FontSize}px ${FONT_STACK}`;
      ctx.fillStyle = "#1f1f23";
      ctx.textAlign = "center";
      ctx.fillText(state.eventInfo, W / 2, 40);
      drawText(ctx, "Scan to Enter", W / 2, 60 + h1FontSize, 16);
    } else {
      drawText(ctx, "Scan to Enter", W / 2, 40, 22, "normal");
    }

    // QR Code box
    const boxX = (W - boxSize) / 2;
    const boxY = (H - boxSize) / 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(boxX, boxY, boxSize, boxSize);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    // QR
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

    // Footer white box
    const footerHeight = 10;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, H - footerHeight, W, footerHeight);

    ctx.font = `italic 10px ${FONT_STACK}`;
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.disclaimer, W / 2, H - footerHeight / 2);
  }

  function drawText(ctx, text, x, y, size, weight = "normal", align = "center") {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    ctx.fillStyle = "#1f1f23";
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  }

  async function renderPreview() {
    const dims = getOrientationDims();
    const stage = document.getElementById("preview-stage");

    // Set CSS aspect ratio for preview
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

  makeQR.addEventListener("click", async () => {
    state.url = urlIn.value.trim() || "https://www.sparklight.com/internet";
    state.eventName = eventIn.value.trim() || "Event";
    state.heading = headingIn.value.trim();
    state.eventInfo = infoIn.value.trim();
    state.disclaimer = disclaimerIn.value.trim() || DEFAULT_DISCLAIMER;

    // Get orientation from selected radio
    const selected = [...orientationInputs].find(r => r.checked);
    state.orientation = selected?.value || "portrait";

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
