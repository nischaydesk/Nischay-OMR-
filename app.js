// Render ka live backend URL
const BACKEND_URL = "https://nischay-omr.onrender.com";

let questionCount = 20;
let selectedOmrFile = null;
let evaluationResult = null;

// Default Answer Key (20 questions)
let answerKey = {
  1:'B', 2:'A', 3:'C', 4:'B', 5:'C', 6:'D', 7:'A', 8:'C', 9:'B', 10:'D',
  11:'C', 12:'A', 13:'D', 14:'B', 15:'C', 16:'A', 17:'D', 18:'C', 19:'A', 20:'A'
};

// Master Answer Grid create karna
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

// Option select karna
function selectOption(q, opt) {
  answerKey[q] = opt;
  renderMatrix();
}

// Tab change karna (20, 50, 80, 100)
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

// File choose hone par preview aur scan button activate karna
function handleFilePreview(e) {
  const file = e.target.files[0];
  if (!file) return;

  selectedOmrFile = file;

  const statusText = document.getElementById("statusText");
  const fileNameDisplay = document.getElementById("fileNameDisplay");
  const previewBox = document.getElementById("previewContainer");
  const previewImg = document.getElementById("imagePreview");
  const btnScan = document.getElementById("btnStartScan");

  if (statusText) statusText.innerText = "Chuni Gayi OMR File:";
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
  } else {
    if (previewBox) previewBox.style.display = "none";
  }

  if (btnScan) {
    btnScan.disabled = false;
    btnScan.style.background = "#2563eb";
    btnScan.style.cursor = "pointer";
  }
}

// Scan request bhejna
async function executeScan() {
  if (!selectedOmrFile) {
    alert("Pehle OMR sheet ki file chunein ya photo kheenchein!");
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
      alert("Error: " + (data.detail || "Sheet check karne me problem hui"));
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
    alert("Server connect nahi hua. Render server ko shuru hone me 30 second lagte hain. Kripya thodi der ruk kar dobara 'Sheet Scan Karein' dabayein.");
  }
}

// Result show karna
function renderResults(data) {
  const s = data.summary;
  document.getElementById("scoreDisplay").innerText = `${s.score} / ${s.total_questions}`;
  document.getElementById("cntCor").innerText = s.correct;
  document.getElementById("cntWro").innerText = s.wrong;
  document.getElementById("cntInv").innerText = s.invalid;
  document.getElementById("cntSkp").innerText = s.skipped;

  let tbl = `<table><tr><th>Q.No</th><th>Student Mark</th><th>Correct Key</th><th>Status</th></tr>`;
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

// Excel export
async function downloadExcel() {
  if (!evaluationResult) {
    alert("Pehle OMR sheet scan karein!");
    return;
  }

  const fd = new FormData();
  fd.append("payload", JSON.stringify(evaluationResult));

  try {
    const res = await fetch(`${BACKEND_URL}/api/export-excel`, {
      method: "POST",
      body: fd
    });

    if (!res.ok) throw new Error("Excel generate nahi hua");

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = `Nischay_OMR_Report_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    alert("Excel marksheet download karne me error aaya.");
  }
}

// Initial load
window.addEventListener("DOMContentLoaded", () => {
  renderMatrix();
});
