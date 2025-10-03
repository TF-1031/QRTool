(() => {
  // --- Constants
  const INCH_W = 8.5, INCH_H = 11;
  const DPI_PRINT = 300;                          // PDF export DPI
  const PX_PRINT_W = Math.round(INCH_W * DPI_PRINT);
  const PX_PRINT_H = Math.round(INCH_H * DPI_PRINT);

  const BOX_IN = 3.16;                             // white box size in inches
  const BOX_W_RATIO = BOX_IN / INCH_W;             // relative to page width
  const BOX_H_RATIO = BOX_IN / INCH_H;             // relative to page height (same; square)
  const QR_INNER_RATIO = 0.90;                     // 10% total padding inside the white box

  // --- State
  const state = {
    eventName: "Event",
    url: "https://www.sparklight.com",
    bg: null,                                      // Image element
  };

  // --- Elements
  const cnv = document.getElementById("previewCanvas");
  const makeQR = document.getElementById("makeQR");
  const saveBtn = document.getElementById("saveBtn");
  const resetBtn = document.getElementById("resetBtn");
  const eventIn = document.getElementById("eventName");
  const urlIn = document.getElementById("urlInput");

  // --- Load background (same-origin on GitHub Pages)
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // --- Core renderer (used for BOTH preview and export)
  // sizePx: the page size in pixels (width,height) for this render.
  async function drawFlyer(ctx, sizePx) {
    const [W, H] = sizePx;

    // Draw background scaled to full page
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(state.bg, 0, 0, W, H);

    // Compute white box size/pos from page ratios → stays perfectly centered
    const boxW = BOX_W_RATIO * W;
    const boxH = BOX_H_RATIO * H; // same as boxW, just clear intent
    const xc = W / 2, yc = H / 2;
    const x = xc - boxW / 2;
    const y = yc - boxH / 2;

    // White box
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, boxW, boxH);

    // QR (black on white), with 10% total padding (5% each side)
    const inner = Math.min(boxW, boxH) * QR_INNER_RATIO; // 90% of box
    const pad = (Math.min(boxW, boxH) - inner) / 2;

    // Generate a QR at the exact inner size (no extra margin)
    const qrDataURL = await QRCode.toDataURL(state.url || "https://www.sparklight.com", {
      width: Math.round(inner),
      margin: 0,
      color: { dark: "#000000", light: "#ffffff" },
    });
    const qrImg = await loadImage(qrDataURL);
    ctx.drawImage(qrImg, x + pad, y + pad, inner, inner);

    // Event name (italic) below the white box
    // Use font size proportional to white box for consistent look
    c
