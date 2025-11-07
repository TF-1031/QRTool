// Event Flyer Builder – Clean Rebuild (300 DPI)
// Output sizes at 300 DPI: Landscape 3300x2550, Portrait 2550x3300


(function () {
const { jsPDF } = window.jspdf;


// --- Constants ---
const DPI = 300; // physical DPI
const INCH = 300; // px per inch at 300 DPI
const SIZES = {
landscape: { W: 11 * DPI, H: 8.5 * DPI }, // 3300 x 2550
portrait: { W: 8.5 * DPI, H: 11 * DPI }, // 2550 x 3300
};


const PADDING = 0.5 * INCH; // 0.5" page padding
const LOGO_MAX = { landscape: 0.55, portrait: 0.65 }; // percent of width
const GAP = 0.18 * INCH; // spacing between blocks
const LINE_HEIGHT = 1.22; // baseline line-height for headline block


const QR_PX = 300; // 300x300 physical px QR (1" square)


const FONT_STACK = '600 48px "Effra","Segoe UI",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif';
const FONT_BOLD = '700 48px "Effra","Segoe UI",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif';
const SMALL_FONT = '400 26px "Effra","Segoe UI",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif';


// --- State ---
const state = {
orientation: 'landscape',
W: SIZES.landscape.W,
H: SIZES.landscape.H,
bgImg: null,
details: '',
textColor: '#6E2F90',
outline: false,
shadow: false,
url: 'https://www.sparklight.com/internet',
};


// --- DOM ---
const banner = document.getElementById('headerBanner');
const form = document.getElementById('flyerForm');
const eventNameEl = document.getElementById('eventName');
const detailsEl = document.getElementById('details');
const urlEl = document.getElementById('contestUrl');
const colorEl = document.getElementById('textColor');
const outlineEl = document.getElementById('outline');
const shadowEl = document.getElementById('shadow');
const formatEl = document.getElementById('format');
const bgFileEl = document.getElementById('bgFile');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');


const canvas = document.getElementById('flyerCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';


// --- Utility: mark as edited -> swap banner ---
const markDirty = () => (banner.src = 'eventflyerbuilder-done.png');


// Mobile label text tweak
(function tweakMobileLabel() {
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
if (isMobile) {
const label = document.getElementById('bgLabel');
if (label) label.textContent = 'Choose File or Take a Photo';
}
})();


// --- Image assets ---
const logo = new Image();
logo.src = 'sparklight-logo.png';


// Read orientation radios
form.elements['orientation'].forEach?.call(form.elements['orientation'], (el) => {
el.addEventListener('change', (e) => {
state.orientation = e.target.value;
const { W, H } = SIZES[state.orientation];
state.W = W; state.H = H;
canvas.width = W; canvas.height = H;
render();
markDirty();
});
});


// Field listeners
[eventNameEl, detailsEl, urlEl, colorEl, outlineEl, shadowEl, formatEl].forEach((el) => {
el.addEventListener('input', () => {
state.details = detailsEl.value.trim();
state.textColor = colorEl.value;
state.outline = outlineEl.checked;
state.shadow = shadowEl.checked;
state.url = urlEl.value.trim() || 'https://www.sparklight.com/internet';
render();
markDirty();
});
});


// Background upload
bgFileEl.addEventListener('change', async (e) => {
const file = e.target.files && e.target.files[0];
if (!file) return;
const img = new Image();
img.crossOrigin = 'anonymous';
img.onload = () => { state.bgImg = img; render(); markDirty(); };
img.onerror = () => { state.bgImg = null; render(); markDirty(); };
img.src = URL.createObjectURL(file);
});
})();
