(() => {
  const DPI = 300, PAGE_W = 8.5, PAGE_H = 11;
  const PX_W = DPI * PAGE_W, PX_H = DPI * PAGE_H;
  const BOX_IN = 3.16, BOX_PX = Math.round(BOX_IN * DPI);

  const state = { eventName: "Event", url: "https://www.sparklight.com" };

  const previewCanvas = document.getElementById('previewCanvas');
  const pctx = previewCanvas.getContext('2d');

  const eventIn  = document.getElementById('eventName');
  const urlIn    = document.getElementById('urlInput');
  const makeQR   = document.getElementById('makeQR');
  const saveBtn  = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');

  function sanitizeName(name) {
    return (name || "flyer")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; 
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function drawPreview() {
    const ctx = pctx;
    const canvas = previewCanvas;

    // Reset canvas size
    canvas.width = 850;
    canvas.height = Math.round((11 / 8.5) * 850);

    // Draw background
    const bg = await loadImage("EVENT-QR-WHT.jpg");
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // QR box
    const boxSize = canvas.width * 0.37;
    const x = (canvas.width - boxSize) / 2;
    const y = (canvas.height - boxSize) / 2;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, boxSize, boxSize);

    // QR image
    const qrDataURL = await QRCode.toDataURL(state.url, { width: boxSize * 0.8, margin: 0 });
    const qrImg = await loadImage(qrDataURL);

    ctx.drawImage(qrImg, x + boxSize * 0.1, y + boxSize * 0.1, boxSize * 0.8, boxSize * 0.8);

    // Border
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + boxSize * 0.1, y + boxSize * 0.1, boxSize * 0.8, boxSize * 0.8);

    // Event text under QR (preview only, 10pt)
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "italic 10pt Effra, 'Segoe UI', Arial, sans-serif";
    ctx.fillText(state.eventName, canvas.width / 2, y + boxSize + 5);
  }

  makeQR.addEventListener('click', async () => {
    state.eventName = eventIn.value.trim() || "Event";
    state.url = urlIn.value.trim() || "https://www.sparklight.com";
    await drawPreview();
    document.getElementById('actions').style.display = 'flex';
  });

  async function buildHiResCanvas() {
    const cnv = document.createElement('canvas');
    cnv.width = PX_W; cnv.height = PX_H;
    const ctx = cnv.getContext('2d');

    const bg = await loadImage("EVENT-QR-WHT.jpg");
    ctx.drawImage(bg, 0, 0, PX_W, PX_H);

    const x = Math.round((PX_W - BOX_PX) / 2);
    const y = Math.round((PX_H - BOX_PX) / 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, BOX_PX, BOX_PX);

    // QR
    const qrDataURL = await QRCode.toDataURL(state.url, { width: BOX_PX * 0.8, margin: 0 });
    const qrImg = await loadImage(qrDataURL);
    ctx.drawImage(qrImg, x + BOX_PX * 0.1, y + BOX_PX * 0.1, BOX_PX * 0.8, BOX_PX * 0.8);

    // Border
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + BOX_PX * 0.1, y + BOX_PX * 0.1, BOX_PX * 0.8, BOX_PX * 0.8);

    // Event name in high-res (8pt scaled to 300 DPI)
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const pxFont = Math.round(8 * DPI / 72); 
    ctx.font = `italic ${pxFont}px Effra, "Segoe UI", Arial, sans-serif`;
    ctx.fillText(state.eventName, PX_W / 2, y + BOX_PX + 15);

    return cnv;
  }

  async function savePDF() {
    const cnv = await buildHiResCanvas();
    const img = cnv.toDataURL("image/jpeg", 1.0);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "in", [PAGE_W, PAGE_H]);
    pdf.addImage(img, "JPEG", 0, 0, PAGE_W, PAGE_H);
    pdf.save(sanitizeName(state.eventName) + ".pdf");
  }

  function resetAll() { location.reload(); }

  saveBtn.addEventListener('click', savePDF);
  resetBtn.addEventListener('click', resetAll);
})();
