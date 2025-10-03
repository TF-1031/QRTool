(() => {
  const INCH_W = 8.5, INCH_H = 11, DPI = 300;
  const PX_W = Math.round(INCH_W * DPI), PX_H = Math.round(INCH_H * DPI);

  const BOX_IN = 3.16;
  const BOX_RATIO_W = BOX_IN / INCH_W;
  const BOX_RATIO_H = BOX_IN / INCH_H;
  const QR_FILL_RATIO = 0.90;

  const LABEL_PT = 8; // Event name font size in points
  const FONT_STACK =
    `"Effra", "Effra CC", "Segoe UI VSS (Regular)", "Segoe UI",
     -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue",
     Helvetica, Ubuntu, Arial, sans-serif, "Apple Color Emoji",
     "Segoe UI Emoji", "Segoe UI Symbol"`;

  const state = {
    eventName: "Event",
    url: "https://www.sparklight.com",
    bg: null
  };

  const cnv = document.getElementById("previewCanvas");
  const ctx = cnv.getContext("2d");
  const eventIn = document.getElementById("eventName");
  const urlIn   = document.getElementById("urlInput");
  const makeQR  = document.getElementById("makeQR");
  const saveBtn = document.getElementById("saveBtn");
  const resetBtn = document.getElementById("resetBtn");

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function sanitizeFilename(name) {
    return (name || "Event")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  }

  async function drawFlyer(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(state.bg, 0, 0, W, H);

    // White QR box
    const boxW = BOX_RATIO_W * W;
    const boxH = BOX_RATIO_H * H;
    const x = (W - boxW) / 2;
    const y = (H - boxH) / 2;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, boxW, boxH);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#000";
    ctx.strokeRect(x, y, boxW, boxH);

    // QR code inside the box
    const inner = Math.min(boxW, boxH) * QR_FILL_RATIO;
    const pad = (Math.min(boxW, boxH) - inner) / 2;

    const qrDataURL = await QRCode.toDataURL(state.url, {
      width: Math.round(inner),
      margin: 0,
      color: { dark: "#000000", light: "#ffffff" }
    });
    const qrImg = await loadImage(qrDataURL);
    ctx.drawImage(qrImg, x + pad, y + pad, inner, inner);

    // Event name at bottom center
    const fontPx = Math.round((LABEL_PT / 72) * DPI);
    ctx.font = `italic ${fontPx}px ${FONT_STACK}`;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(state.eventName, W / 2, H - 5);
  }

  async function renderPreview() {
    const stage = document.getElementById("preview-stage");
    const cssW = stage.clientWidth;
    const cssH = stage.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    cnv.width = Math.round(cssW * dpr);
    cnv.height = Math.round(cssH * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    await drawFlyer(ctx, cssW, cssH); // ✅ no crosshairs
  }

  async function savePDF() {
    const off = document.createElement("canvas");
    off.width = PX_W; off.height = PX_H;
    const offCtx = off.getContext("2d");
    await drawFlyer(offCtx, PX_W, PX_H);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "in", [INCH_W, INCH_H]);
    pdf.addImage(off.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, INCH_W, INCH_H);
    pdf.save(sanitizeFilename(state.eventName) + ".pdf");
  }

  makeQR.addEventListener("click", async () => {
    state.eventName = (eventIn.value || "Event").trim();
    state.url = (urlIn.value || "https://www.sparklight.com").trim();
    await renderPreview();
  });

  saveBtn.addEventListener("click", savePDF);
  resetBtn.addEventListener("click", () => location.reload());

  (async () => {
    state.bg = await loadImage("EVENT-QR-WHT.jpg");
    await renderPreview();
    window.addEventListener("resize", () => {
      clearTimeout(renderPreview._t);
      renderPreview._t = setTimeout(renderPreview, 100);
    });
  })();
})();
