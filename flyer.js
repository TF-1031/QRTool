import QRCode from "https://cdn.skypack.dev/qrcode";

const canvas = document.getElementById("flyerCanvas");
const ctx = canvas.getContext("2d");

const HEADER_NORMAL = "eventflyerbuilder-logo.png";
const HEADER_DONE   = "eventflyerbuilder-done.png";
const headerImageEl = document.getElementById("headerImage");

let headerSwapped = false;

const FONT_STACK = `"Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

const state = {
  orientation: document.querySelector('input[name="orientation"]:checked')?.value || "landscape",
  eventName: "",
  contestDetailsRaw: "",
  contestDetails: "",   // transformed to MLA Title Case (with acronyms preserved)
  url: "https://www.sparklight.com/internet",
  image: null,
  logo: null,           // sparklight logo image
  textColor: "#A600A5",
  effectOutline: false, // white outline
  effectShadow: false   // drop shadow
};

/* ---------- MLA Title Case with Acronym Preservation ----------
   - Keeps ALL-CAPS tokens as-is (TV, USA)
   - Keeps tokens with internal caps as-is (eBay, iPhone, NASA)
   - Applies MLA small-words rule otherwise
*/
function mlaTitleCasePreserveAcronyms(input) {
  if (!input) return "";
  const smallWords = new Set([
    "a","an","and","as","at","but","by","for","in","nor","of","on","or","so","the","to","up","yet","with"
  ]);

  const words = input.split(/\s+/);

  return words.map((word, idx) => {
    const isFirstOrLast = idx === 0 || idx === words.length - 1;

    // Preserve as-is if the user used all caps or internal caps
    const hasInternalCaps = /[A-Z].*[A-Z]|[A-Z][a-z]+[A-Z]/.test(word) || (/[A-Z]/.test(word) && /[a-z]/.test(word) === false);
    if (hasInternalCaps) return word;

    const lower = word.toLowerCase();

    if (!isFirstOrLast && smallWords.has(lower)) {
      return lower;
    }

    // Capitalize first letter only
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

/* ---------- Filename helpers ---------- */
function sanitizeFilename(name) {
  return (name || "flyer").trim().replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_").toUpperCase();
}
function shortMonthYearNow() {
  const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const d = new Date();
  const mm = MONTHS[d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}${yy}`;
}

/* ---------- Text wrap / autoscale ---------- */
function wrapText(width, text, fontSize) {
  ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
  const words = (text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > width) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
function autoScaleTextToLines(text, width, maxLines, startSize, minSize=10, step=2) {
  let size = startSize;
  while (size >= minSize) {
    const lines = wrapText(width, text, size);
    if (lines.length <= maxLines) return { fontSize: size, lines };
    size -= step;
  }
  return { fontSize: minSize, lines: wrapText(width, text, minSize) };
}

/* ---------- State update ---------- */
function updateStateFromInputs() {
  state.orientation = document.querySelector('input[name="orientation"]:checked').value;
  state.eventName = document.getElementById("eventName").value.trim();
  state.contestDetailsRaw = document.getElementById("contestDetails").value.trim();
  state.contestDetails = mlaTitleCasePreserveAcronyms(state.contestDetailsRaw);
  state.url = document.getElementById("url").value.trim();
  state.textColor = document.getElementById("textColorSelect").value;
  state.effectOutline = document.getElementById("effectOutline").checked;
  state.effectShadow = document.getElementById("effectShadow").checked;

  // Header swap: show DONE if any meaningful text present
  if ((state.eventName || state.contestDetailsRaw) && !headerSwapped) {
    headerSwapped = true;
    headerImageEl.src = HEADER_DONE;
  } else if (!state.eventName && !state.contestDetailsRaw) {
    headerSwapped = false;
    headerImageEl.src = HEADER_NORMAL;
  }
}

/* ---------- Listeners ---------- */
document.querySelectorAll("input, textarea, select").forEach(el => {
  el.addEventListener("input", async () => {
    updateStateFromInputs();
    await drawFlyer();
  });
});

document.getElementById("imageUpload").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    const img = new Image();
    img.onload = async () => {
      state.image = img;
      await drawFlyer();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById("resetBtn").addEventListener("click", async () => {
  document.getElementById("flyerForm").reset();
  headerSwapped = false;
  headerImageEl.src = HEADER_NORMAL;

  state.eventName = "";
  state.contestDetailsRaw = "";
  state.contestDetails = "";
  state.url = "https://www.sparklight.com/internet";
  state.textColor = "#A600A5";
  state.effectOutline = false;
  state.effectShadow = false;
  state.image = null;

  await drawFlyer();
});

document.getElementById("saveBtn").addEventListener("click", async () => {
  const format = document.getElementById("downloadFormat").value;

  const base = sanitizeFilename(state.eventName || "FLYER");
  const short = shortMonthYearNow();  // e.g., MAR25
  const fileBase = `${base}_${short}`;

  if (format === "jpg") {
    const a = document.createElement("a");
    a.download = `${fileBase}.jpg`;
    a.href = canvas.toDataURL("image/jpeg", 0.92);
    a.click();
    return;
  }

  if (format === "pdf") {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: state.orientation === "portrait" ? "p" : "l",
      unit: "pt",
      format: [canvas.width, canvas.height]
    });
    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${fileBase}.pdf`);
  }
});

/* ---------- Drawing ---------- */
async function drawFlyer() {
  const W = state.orientation === "portrait" ? 850 : 1100;
  const H = state.orientation === "portrait" ? 1100 : 850;

  canvas.width = W;
  canvas.height = H;

  // base white
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // background image cover + gentle fade
  if (state.image) {
    const img = state.image;
    const arImg = img.width / img.height;
    const arCan = W / H;
    let dw, dh, ox, oy;
    if (arImg > arCan) { dh = H; dw = dh * arImg; ox = (W - dw)/2; oy = 0; }
    else { dw = W; dh = dw / arImg; ox = 0; oy = (H - dh)/2; }
    ctx.globalAlpha = 0.4;
    ctx.drawImage(img, ox, oy, dw, dh);
    ctx.globalAlpha = 1;

    // soft top fade
    const grad = ctx.createLinearGradient(0,0,0,H*0.35);
    grad.addColorStop(0,"rgba(255,255,255,1)");
    grad.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H*0.35);
  }

  // Sparklight logo (pink circle area from your diagram)
  if (state.logo) {
    const lw = Math.max(W * 0.20, 140);
    const lh = lw / (state.logo.width / state.logo.height);
    const padTop = 10; // exactly 10px from top
    ctx.drawImage(state.logo, (W - lw)/2, padTop, lw, lh);
  }

  // Title (auto-fit to 2 lines)
  const qrSize = W * 0.25;
  const maxTextWidth = qrSize * 2.5;
  const initialFontSize = qrSize * 0.26;

  const { fontSize, lines } =
    autoScaleTextToLines(state.contestDetails, maxTextWidth, 2, initialFontSize);

  const lineSpacing = fontSize * 1.1;
  const textBlockHeight = lines.length * lineSpacing;
  const contentTopY = H / 2 - (textBlockHeight + qrSize + 60) / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `900 ${fontSize}px ${FONT_STACK}`;

  lines.forEach((line, i) => {
    const y = contentTopY + i * lineSpacing;

    // Shadow
    if (state.effectShadow) {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Outline (white as requested)
    if (state.effectOutline) {
      ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.10));
      ctx.strokeStyle = "#FFFFFF";
      ctx.strokeText(line, W / 2, y);
    }

    ctx.fillStyle = state.textColor;
    ctx.fillText(line, W / 2, y);
  });

  // QR box (white box width controls the header matching width visually)
  const qrPadding = qrSize * 0.10;
  const boxX = (W - (qrSize + qrPadding * 2)) / 2;
  const boxY = contentTopY + textBlockHeight + 35;
  const qrTotalHeight = qrSize + qrPadding * 2 + 40;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(boxX, boxY, qrSize + qrPadding * 2, qrTotalHeight);

  const qrDataURL = await QRCode.toDataURL(state.url, {
    width: Math.round(qrSize),
    margin: 0,
    color: { dark: "#000000", light: "#ffffff" }
  });

  const qrImg = await loadImage(qrDataURL);
  ctx.drawImage(qrImg, boxX + qrPadding, boxY + qrPadding, qrSize, qrSize);

  ctx.fillStyle = "#000000";
  ctx.font = `bold ${qrSize * 0.09}px ${FONT_STACK}`;
  ctx.fillText("Scan to Enter", W / 2, boxY + qrSize + qrPadding + 10);
}

/* ---------- Utilities ---------- */
function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

/* ---------- Load Sparklight logo, then init ---------- */
const logoImg = new Image();
logoImg.onload = () => { state.logo = logoImg; drawFlyer(); };
logoImg.src = "sparklight-logo.png";

/* ---------- Kickoff ---------- */
updateStateFromInputs();
drawFlyer();
