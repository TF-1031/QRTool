(() => {
  const DPI = 300, PAGE_W = 8.5, PAGE_H = 11;
  const PX_W = DPI * PAGE_W, PX_H = DPI * PAGE_H;
  const BOX_IN = 3.16, BOX_PX = Math.round(BOX_IN * DPI);

  const state = { eventName: "Event", url: "https://www.sparklight.com" };

  const qrPrev   = document.getElementById('qrPreview');
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

  makeQR.addEventListener('click', async () => {
    state.eventName = eventIn.value.trim() || "Event";
    state.url = urlIn.value.trim() || "https://www.sparklight.com";

    const size = Math.min(
      (qrPrev.width = document.getElementById('qrInner').clientWidth),
      (qrPrev.height = document.getElementById('qrInner').clientHeight)
    );
    await QRCode.toCanvas(qrPrev, state.url, { width: size, margin: 0 });

    document.getElementById('actions').style.display = 'flex';
  });

  async function buildHiResCanvas() {
    const cnv = document.createElement('canvas');
    cnv.width = PX_W; cnv.height = PX_H;
    const ctx = cnv.getContext('2d');

    // Background
    const bg = await loadImage("EVENT-QR-WHT.jpg");
    ctx.drawImage(bg, 0, 0, PX_W, PX_H);

    // White QR box
    const x = Math.round((PX_W - BOX_PX) / 2);
    const y = Math.round((PX_H - BOX_PX) / 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, BOX_PX, BOX_PX);

    // QR code
    const innerSize = BOX_PX * 0.80;
    const pad = BOX_PX * 0.10 / 2;
    const qrDataURL = await QRCode.toDataURL(state.url, { width: innerSize, margin: 0 });
    const qrImg = await loadImage(qrDataURL);

    // Black border around QR
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + pad, y + pad, innerSize, innerSize);

    ctx.drawImage(qrImg, x + pad, y + pad, innerSize, innerSize);

    // ✅ Event label under QR (true 8pt scaled to 300DPI)
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const ptSize = 8;  
    const pxFont = Math.round(ptSize * DPI / 72); // convert 8pt → 300DPI pixels
    ctx.font = `italic ${pxFont}px "Effra","Segoe UI","Arial",sans-serif`;

    ctx.fillText(state.eventName, PX_W / 2, y + BOX_PX + 5);

    return cnv;
  }

  async function savePDF() {
    if (!state.url) {
      alert("Enter a URL.");
      return;
    }
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
