// Nischay OMR Pro - Core Application Controller
const BACKEND_URL = "https://nischay-omr.onrender.com";

let questionCount = 20;
let selectedOmrFile = null;
let evaluationResult = null;

// मास्टर आंसर की खाली रखी गई है (कोई डिफ़ॉल्ट उत्तर नहीं)
let answerKey = {};

// ==========================================
// 0. CUSTOM TOAST NOTIFICATION (No Default Alert)
// ==========================================
function showToast(message, type = "info") {
  let toast = document.getElementById("proToastNotification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "proToastNotification";
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "99999";
    toast.style.minWidth = "280px";
    toast.style.maxWidth = "90%";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "10px";
    toast.style.fontSize = "13px";
    toast.style.fontWeight = "700";
    toast.style.textAlign = "center";
    toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.35)";
    toast.style.transition = "opacity 0.3s ease, top 0.3s ease";
    document.body.appendChild(toast);
  }

  if (type === "error") {
    toast.style.background = "#dc2626";
    toast.style.color = "#ffffff";
  } else if (type === "success") {
    toast.style.background = "#16a34a";
    toast.style.color = "#ffffff";
  } else if (type === "warning") {
    toast.style.background = "#d97706";
    toast.style.color = "#ffffff";
  } else {
    toast.style.background = "#1e40af";
    toast.style.color = "#ffffff";
  }

  toast.innerText = message;
  toast.style.opacity = "1";
  toast.style.top = "25px";

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.top = "-50px";
  }, 4000);
}

// ==========================================
// 1. MASTER KEY MATRIX UI BUILDER (5 to 100 Q)
// ==========================================
function renderMatrix() {
  const container = document.getElementById("matrixContainer");
  if (!container) return;

  let html = "";
  const opts = ["A", "B", "C", "D"];

  for (let i = 1; i <= questionCount; i++) {
    const activeOpt = answerKey[i] || "";
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
  // अगर वही विकल्प दोबारा दबाया जाए तो अनसेलेक्ट (खाली) हो जाएगा
  if (answerKey[q] === opt) {
    delete answerKey[q];
  } else {
    answerKey[q] = opt;
  }
  renderMatrix();
}

// 5 से 100 तक डायनामिक सवाल सेट करने का फ़ंक्शन
function setQuestions(num) {
  num = parseInt(num);
  if (isNaN(num) || num < 5) num = 5;
  if (num > 100) num = 100;

  questionCount = num;

  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.classList.remove('active');
    const text = btn.innerText;
    if (text.includes(String(num))) {
      btn.classList.add('active');
    }
  });

  renderMatrix();
}

// ==========================================
// 2. FILE & CAMERA PREVIEW CONTROLLER
// ==========================================
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
  }
}

// ==========================================
// 3. SCAN EXECUTION
// ==========================================
async function executeScan() {
  if (!selectedOmrFile) {
    showToast("कृपया पहले OMR शीट की फ़ाइल चुनें!", "warning");
    return;
  }

  // जाँचना कि कम से कम कुछ सवालों की आंसर की सेट है या नहीं
  if (Object.keys(answerKey).length === 0) {
    showToast("कृपया मास्टर आंसर की में कम से कम सही उत्तर सेट करें!", "warning");
    return;
  }

  const fd = new FormData();
  fd.append("file", selectedOmrFile);
  fd.append("answer_key", JSON.stringify(answerKey));
  fd.append("total_q", questionCount);

  const resPanel = document.getElementById("resultsPanel");
  const btnScan = document.getElementById("btnStartScan");

  if (resPanel) resPanel.style.display = "none";
  if (btnScan) btnScan.disabled = true;

  try {
    const res = await fetch(`${BACKEND_URL}/api/scan`, {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    if (btnScan) btnScan.disabled = false;

    if (!res.ok) {
      const msg = data.detail || "शीट जाँचने में समस्या आई।";
      showToast(msg, "error");
      throw new Error(msg);
    }

    evaluationResult = data;
    renderResults(data);
    showToast("मूल्यांकन सफलतापूर्वक संपन्न हुआ!", "success");

    if (resPanel) {
      resPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

  } catch (err) {
    if (btnScan) btnScan.disabled = false;
    showToast("सर्वर प्रतिक्रिया में विलंब या त्रुटि। पुनः प्रयास करें।", "error");
    throw err;
  }
}

// ==========================================
// 4. RENDER RESULTS & STUDENT CREDENTIALS
// ==========================================
function renderResults(data) {
  const s = data.summary;
  
  const nameEl = document.getElementById("resStudentName");
  const rollEl = document.getElementById("resRollNo");
  if (nameEl) nameEl.innerText = data.student_name || "STUDENT";
  if (rollEl) rollEl.innerText = data.roll_no || "N/A";

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

// ==========================================
// 5. EXPORT: CLASS EXCEL (.XLSX)
// ==========================================
async function downloadExcel() {
  if (!evaluationResult) {
    showToast("पहले OMR शीट स्कैन करें!", "warning");
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
    a.download = `Nischay_OMR_Class_Report_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("एक्सेल मार्कशीट डाउनलोड हो गई!", "success");
  } catch (err) {
    showToast("Excel मार्कशीट डाउनलोड करने में त्रुटि आई।", "error");
  }
}

// ==========================================
// 6. EXPORT: STUDENT PDF SCORECARD
// ==========================================
function downloadStudentPDF() {
  if (!evaluationResult) {
    showToast("पहले OMR शीट स्कैन करें!", "warning");
    return;
  }

  if (typeof generateStudentPDF === "function") {
    generateStudentPDF(evaluationResult);
  } else {
    showToast("PDF Engine लोड नहीं हुआ। कृपया पेज रिफ्रेश करें।", "error");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  renderMatrix();
});
