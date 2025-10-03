(() => {
  const DPI = 300, PAGE_W = 8.5, PAGE_H = 11;
  const PX_W = DPI * PAGE_W, PX_H = DPI * PAGE_H;
  const BOX_IN = 3.16, BOX_PX = Math.round(BOX_IN * DPI);

  const state = { eventName: "Event", url: "" }; // default Event

  const qrPrev   = document.getElementById('qrPreview');
  const eventLbl = document.getElementById('eventLabel');

  const eventIn  = document.getElementById('eventName');
  const urlIn    = document.getElementById('urlInput');
  const makeQR   = document.getElementById('makeQR');
  const saveBtn  = document.getElementById('saveBtn');
  const printBtn = document.getElementById('printBtn');
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
      img.crossOrigin = "anonymous"; // important for GitHub Pages hosting
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  makeQR.addEventListener('click', async () => {
    state.eventName = eventIn.value.trim() || "Event"; // ✅ default
    state.url = urlIn.value.trim();
    if (!state.url) {
      alert("Enter a URL.");
      return;
    }

    const size = Math.min(
      (qrPrev.width = document.getElementById('qrInner').clientWidth),
      (qrPrev.height = document.getElementById('qrInner').clientHeight)
    );
    await QRCode.toCanvas(qrPrev, state.url, { width: size, margin: 0 });

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

    // ✅ QR code with 10% total padding (5% each side)
    const innerSize = BOX_PX * 0.80;        // 80% fill
    const pad = BOX_PX * 0.10 / 2;          // 5% per side
    const qrDataURL = await QRCode.toDataURL(state.url, { width: innerSize, margin: 0 });
    const qrImg = await loadImage(qrDataURL);
    ctx.drawImage(qrImg, x + pad, y + pad, innerSize, innerSize);

   // Event label under QR
ctx.fillStyle = "#000";
ctx.textAlign = "center";
ctx.textBaseline = "top";
const cssPx = 12, px300 = Math.round(cssPx * DPI / 96);
ctx.font = `italic 400 ${px300}px Arial, sans-serif`;
    ctx.fillText(state.eventName, PX_W / 2, y + BOX_PX + Math.round(0.17 * px300));
const labelOffset = Math.round(0.35 * px300); // more generous padding
ctx.fillText(state.eventName, PX_W / 2, y + BOX_PX + labelOffset);

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

  async function printPDF() {
    if (!state.url) {
      alert("Enter a URL.");
      return;
    }
    const cnv = await buildHiResCanvas();
    const img = cnv.toDataURL("image/jpeg", 1.0);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "in", [PAGE_W, PAGE_H]);
    pdf.addImage(img, "JPEG", 0, 0, PAGE_W, PAGE_H);
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = 0; iframe.style.height = 0; iframe.style.border = 0;
    document.body.appendChild(iframe);
    iframe.onload = () => setTimeout(() => iframe.contentWindow.print(), 150);
    iframe.src = url;
  }

  function resetAll() { location.reload(); }

  saveBtn.addEventListener('click', savePDF);
  printBtn.addEventListener('click', printPDF);
  resetBtn.addEventListener('click', resetAll);
})();
