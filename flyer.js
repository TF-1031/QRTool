(() => {
  const INCH_W = 8.5, INCH_H = 11, DPI = 300;
  const PX_W = INCH_W * DPI, PX_H = INCH_H * DPI;

  const BOX_IN = 3.16;
  const BOX_RATIO_W = BOX_IN / INCH_W;
  const BOX_RATIO_H = BOX_IN / INCH_H;
  const QR_RATIO = 0.90;

  const state = {
    eventName: "Event",
    url: "https://www.sparklight.com",
    bg: null
  };

  const cnv = document.getElementById("previewCanvas");
  const ctx = cnv.getContext("2d");

  const eventIn = document.getElementById("eventName");
  const urlIn = document.getElementById("urlInput");
  const makeQR = document.getElementById("makeQR");
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

  async function drawFlyer(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(state.bg, 0, 0, W, H);

    const boxW = BOX_RATIO_W * W;
    const boxH = BOX_RATIO_H * H;
    const x = (W - boxW) / 2;
    const y = (H - boxH) / 2;

    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, boxW, boxH);

    const inner = boxW * QR_RATIO;
    const pad = (boxW - inner) / 2;

    const qrDataURL = await QRCode.toDataURL(state.url, {
      width: Math.round(inner),
      margin: 0,
      color: { dark: "#000000", light: "#ffffff" }
    });
    const qrImg = await loadImage(qrDataURL);
    ctx.drawImage(qrImg, x + pad, y + pad, inner, inner);

    // Event label
    const fontPx = Math.round(inner * 0.08);
    const labelOffset = fontPx * 0.6;  // tighter than before
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `italic ${fontPx}px Arial, sans-serif`;
    ctx.fillText(state.eventName, W / 2, y + boxH + labelOffset);
  }

  async function renderPreview() {
    const stage = document.getElementById("preview-stage");
    const cssW = stage.clientWidth;
    const cssH = stage.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    cnv.width = cssW * dpr;
    cnv.height = cssH * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    await drawFlyer(ctx, cssW, cssH);
  }

  async function savePDF() {
    const off = document.createElement("canvas");
    off.width = PX_W; off.height = PX_H;
    const offCtx = off.getContext("2d");

    await drawFlyer(offCtx, PX_W, PX_H);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "in", [INCH_W, INCH_H]);
    pdf.addImage(off.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, INCH_W, INCH_H);
    pdf.save(state.eventName.replace(/\W+/g, "_") + ".pdf");
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
