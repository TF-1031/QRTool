:root{
  --bg:#051931;
  --brand:#8d3b91;
  --ink:#1f2230;
  --card:#ffffff;
  --ring:#dcdfe8;
}

*{box-sizing:border-box}

html,body{
  margin:0;
  padding:0;
  background:var(--bg);
  color:var(--ink);
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
}

.page{
  max-width:1100px;
  margin:auto;
  padding:20px;
}

.card{
  background:var(--card);
  border-radius:14px;
  box-shadow:0 10px 30px rgba(0,0,0,.18);
  margin-bottom:28px;
  overflow:hidden;
}

.header-bar{
  width:100%;
  background:#120a1f;
}
.header-bar img{
  display:block;
  width:100%;
  height:180px;
  object-fit:cover;
}

.form{
  padding:18px 20px 24px;
}

.cols{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:34px;               /* gutter between columns */
}

label{
  display:block;
  font-size:13px;
  font-weight:600;
  margin:12px 0 6px;
}

input[type="text"],
select,
textarea,
input[type="file"]{
  width:100%;
  font-size:15px;
  padding:10px 12px;
  border:1px solid var(--ring);
  border-radius:10px;
  outline:none;
}
textarea{ min-height:110px; resize:vertical; }

.effects{
  display:flex;
  gap:18px;
  align-items:center;
  margin-top:10px;
}

.orient{
  display:flex;
  gap:14px;
  margin-top:8px;
}

.buttons{
  display:flex;
  gap:10px;
  margin-top:14px;
}

.btn{
  background:var(--brand);
  color:#fff;
  border:none;
  border-radius:999px;
  padding:10px 16px;
  font-weight:700;
  cursor:pointer;
}
.btn-ghost{
  background:#e9e7ee;
  color:#3a3550;
}

.preview-card{
  padding:18px;
}
#flyerCanvas{
  width:100%;
  max-width:100%;
  height:auto;
  display:block;
  background:#fff;
  border-radius:12px;
}

/* Mobile */
@media (max-width:760px){
  .cols{ grid-template-columns:1fr; gap:18px; }
  .header-bar img{ height:160px; }
}
