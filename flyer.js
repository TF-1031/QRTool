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

  async function drawFlyer(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);

    // Draw background image
    if (state.bgImage) {
      ctx.globalAlpha = 0.7;
      const aspect = state.bgImage.width / state.bgImage.height;
      const targetHeight = W / aspect;
      ctx.drawImage(state.bgImage, 0, (H - targetHeight) / 2, W, targetHeight);
      ctx.globalAlpha = 1.0;
    }

    // Heading
    if (state.heading) {
      drawText(ctx, state.heading, W / 2, 60, 28, "bold");
    }

    // White QR box
    const boxSize = Math.min(W, H) * 0.5;
    const boxX = (W - boxSize) / 2;
    const boxY = (H - boxSize) / 2;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(boxX, boxY, boxSize, boxSize);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    // QR Code
    const qrSize = boxSize * 0.92;
    const qrPad = (boxSize - qrSize) / 2;

    const qrDataURL = await QRCode.toDataURL(state.url, {
      width: Math.round(qrSize),
      margin: 0,
      color: { dark: "#000000", light: "#ffffff" }
    });

    const qrImg = new Image();
    await new Promise((res, rej) => {
      qrImg.onload = res;
      qrImg.onerror = rej;
      qrImg.src = qrDataURL;
    });

    ctx.drawImage(qrImg, boxX + qrPad, boxY + qrPad, qrSize, qrSize);

    // Event Info / default "Scan to Enter"
    const infoText = state.eventInfo || "Scan to Enter";
    drawText(ctx, infoText, W / 2, boxY + boxSize + 30, 18, "normal");

    // Disclaimer inside white box
    const disclaimerY = boxY + boxSize - 8;
    ctx.font = `italic 12px ${FONT_STACK}`;
    ctx.fillStyle = "#444";
    ctx.textAlign = "center";
    ctx.fillText(state.disclaimer, W / 2, disclaimerY);
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

  // Init
  renderPreview();
})();
