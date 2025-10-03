(() => {
  const DPI = 300, PAGE_W = 8.5, PAGE_H = 11;
  const PX_W = DPI * PAGE_W, PX_H = DPI * PAGE_H;
  const BOX_IN = 3.16, BOX_PX = Math.round(BOX_IN * DPI);

  const state = { eventName: "Event", url: "https://www.sparklight.com" };

  const qrPrev   = document.getElementById('previewCanvas');
  const eventLbl = document.getElementById('eventLabel');
  const eventIn  = document.getElementById('eventName');
  const urlIn    = document.getElementById('urlInput');
  const makeQR   = document.getElementById('makeQR');
  const saveBtn  = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');

  function sanitizeName(name) {
    return (name || "flyer").replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "_");
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

    const size = qrPrev.width = qrPrev.height = 300;
    await QRCode.toCanvas(qrPrev, state.url, { width: size, margin: 1, color: { dark: "#000000", light: "#FFFFFF" } });

    eventLbl.textContent = state.eventName;
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
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, BOX_PX, BOX_PX);

    const qrDataURL = await QRCode.toDataURL(state.url, { width: BOX_PX * 0.9, margin: 1 });
    const qrImg = await loadImage(qrDataURL);
    ctx.drawImage(qrImg, x + BOX_PX*0.05, y + BOX_PX*0.05, BOX_PX*0.9, BOX_PX*0.9);

    // Event label
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const px300 = Math.round((10 / 72) * DPI); // ~10pt
    ctx.font = `italic ${px300}px "Effra", "Effra CC", "Segoe UI VSS (Regular)", "Segoe UI",
                -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Helvetica, Ubuntu, Arial, sans-serif`;
    ctx.fillText(state.eventName, PX_W / 2, y + BOX_PX + px300 * 0.3);

    return cnv;
  }

  async function savePDF() {
    if (!state.url) { alert("Enter a URL."); return; }
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
