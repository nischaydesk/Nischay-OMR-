const BACKEND_URL = "https://nischay-omr.onrender.com";

let questionCount = 20;
let selectedOmrFile = null;
let evaluationResult = null;

let answerKey = {
  1:'B', 2:'A', 3:'C', 4:'B', 5:'C', 6:'D', 7:'A', 8:'C', 9:'B', 10:'D',
  11:'C', 12:'A', 13:'D', 14:'B', 15:'C', 16:'A', 17:'D', 18:'C', 19:'A', 20:'A'
};

function renderMatrix() {
  const container = document.getElementById("matrixContainer");
  if (!container) return;

  let html = "";
  const opts = ["A", "B", "C", "D"];

  for (let i = 1; i <= questionCount; i++) {
    const activeOpt = answerKey[i] || "A";
    html += `
      <div class="matrix-row">
        <div class="q-label">Q${i < 10 ? '0' + i : i}</div>
        <div class="options-group">
          ${opts.map(opt => `
            <div class="opt-bubble ${activeOpt === opt ? 'selected' : ''}" onclick="selectOption(${i}, '${opt}')">
              ${opt}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

function selectOption(q, opt) {
  answerKey[q] = opt;
  renderMatrix();
}

function setQuestions(num) {
  questionCount = num;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (event && event.target) {
    event.target.classList.add('active');
  }

  for (let i = 1; i <= num; i++) {
    if (!answerKey[i]) answerKey[i] = "A";
  }

  renderMatrix();
}

function handleFilePreview(e) {
  const file = e.target.files[0];
  if (!file) return;

  selectedOmrFile = file;

  const statusText = document.getElementById("statusText");
  const fileNameDisplay = document.getElementById("fileNameDisplay");
  const previewBox = document.getElementById("previewContainer");
  const previewImg = document.getElementById("imagePreview");
  const btnScan = document.getElementById("btnStartScan");

  if (statusText) statusText.innerText = "चयनित OMR फ़ाइल:";
  if (fileNameDisplay) {
    fileNameDisplay.innerText = file.name;
    fileNameDisplay.style.display = "inline-block";
  }

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      if (previewImg) previewImg.src = evt.target.result;
      if (previewBox) previewBox.style.display = "block";
    };
    reader.readAsDataURL(file);
  }

  if (btnScan) {
    btnScan.disabled = false;
    btnScan.style.background = "#2563eb";
    btnScan.style.cursor = "pointer";
  }
}

async function executeScan() {
  if (!selectedOmrFile) {
    alert("कृपया पहले OMR शीट की फ़ाइल चुनें!");
    return;
  }

  const fd = new FormData();
  fd.append("file", selectedOmrFile);
  fd.append("answer_key", JSON.stringify(answerKey));
  fd.append("total_q", questionCount);

  const loader = document.getElementById("loader");
  const resPanel = document.getElementById("resultsPanel");
  const btnScan = document.getElementById("btnStartScan");

  if (loader) loader.style.display = "block";
  if (resPanel) resPanel.style.display = "none";
  if (btnScan) btnScan.disabled = true;

  try {
    const res = await fetch(`${BACKEND_URL}/api/scan`, {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    if (loader) loader.style.display = "none";
    if (btnScan) btnScan.disabled = false;

    if (!res.ok) {
      alert("Error: " + (data.detail || "Sheet चेक करने में समस्या आई"));
      return;
    }

    evaluationResult = data;
    renderResults(data);

    if (resPanel) {
      resPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

  } catch (err) {
    if (loader) loader.style.display = "none";
    if (btnScan) btnScan.disabled = false;
    alert("सर्वर कनेक्ट नहीं हुआ। Render सर्वर को शुरू होने में 30 सेकंड का समय लग सकता है।");
  }
}

function renderResults(data) {
  const s = data.summary;
  document.getElementById("scoreDisplay").innerText = `${s.score} / ${s.total_questions}`;
  document.getElementById("cntCor").innerText = s.correct;
  document.getElementById("cntWro").innerText = s.wrong;
  document.getElementById("cntInv").innerText = s.invalid;
  document.getElementById("cntSkp").innerText = s.skipped;

  let tbl = `<table><tr><th>Q.No</th><th>छात्र उत्तर</th><th>सही उत्तर</th><th>परिणाम</th></tr>`;
  data.details.forEach(row => {
    let cls = "status-skp";
    if (row.Status === "सही") cls = "status-cor";
    else if (row.Status === "गलत") cls = "status-wro";
    else if (row.Status === "अमान्य") cls = "status-inv";

    tbl += `
      <tr>
        <td><b>${row.Question}</b></td>
        <td><b>${row.Student_Marked}</b></td>
        <td>${row.Answer_Key}</td>
        <td class="${cls}">${row.Status}</td>
      </tr>
    `;
  });
  tbl += `</table>`;

  document.getElementById("tableContainer").innerHTML = tbl;
  document.getElementById("resultsPanel").style.display = "block";
}

async function downloadExcel() {
  if (!evaluationResult) {
    alert("पहले OMR शीट स्कैन करें!");
    return;
  }

  const fd = new FormData();
  fd.append("payload", JSON.stringify(evaluationResult));

  try {
    const res = await fetch(`${BACKEND_URL}/api/export-excel`, {
      method: "POST",
      body: fd
    });

    if (!res.ok) throw new Error("Excel फ़ाइल जनरेट नहीं हुई");

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = `Nischay_OMR_Report_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    alert("Excel मार्कशीट डाउनलोड करने में त्रुटि आई।");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  renderMatrix();
});
