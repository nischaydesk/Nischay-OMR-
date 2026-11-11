// Nischay OMR Pro - Core Application Controller (High-Speed & Ultra-Precision Engine)
const BACKEND_URL = "https://nischay-omr.onrender.com";

let questionCount = 20;
let selectedOmrFile = null;
let evaluationResult = null;

// मास्टर आंसर की खाली (कोई डिफ़ॉल्ट उत्तर नहीं)
let answerKey = {};

// ==========================================
// 0. CUSTOM TOAST NOTIFICATION
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
// 1. HIGH-SPEED IMAGE OPTIMIZER (5s Scan Fix)
// ==========================================
async function compressImageForFastScan(file) {
  // यदि फाइल PDF है तो उसे कंप्रेस न करें
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // अधिकतम 1200px रिज़ॉल्यूशन — AI विज़न के लिए सबसे उपयुक्त और सुपरफास्ट
      const maxDim = 1200;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // कंट्रास्ट और शार्पनेस फ़िल्टर ताकि स्याही और छपे अक्षरों में कोई भ्रम न रहे
      ctx.filter = "contrast(1.15) brightness(1.02)";
      ctx.drawImage(img, 0, 0, width, height);

      // 0.85 क्वालिटी पर JPEG ब्लॉब (~250KB से 350KB साइज)
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const fastFile = new File([blob], "fast_sheet.jpg", { type: "image/jpeg" });
        resolve(fastFile);
      }, "image/jpeg", 0.85);
    };

    img.onerror = () => {
      resolve(file);
    };
  });
}

// ==========================================
// 2. MASTER KEY MATRIX UI BUILDER (5 to 100 Q)
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
  if (answerKey[q] === opt) {
    delete answerKey[q];
  } else {
    answerKey[q] = opt;
  }
  renderMatrix();
}

function setQuestions(num) {
  num = parseInt(num);
  if (isNaN(num) || num < 5) num = 5;
  if (num > 100) num = 100;

  questionCount = num;

  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.classList.remove('active');
    const tabNum = parseInt(btn.getAttribute("data-q"));
    if (tabNum === num) {
      btn.classList.add('active');
    }
  });

  renderMatrix();
}

// ==========================================
// 3. SCAN EXECUTION (LIGHTNING FAST)
// ==========================================
async function executeScan() {
  if (!selectedOmrFile) {
    showToast("कृपया पहले OMR शीट की फ़ाइल चुनें!", "warning");
    return;
  }

  if (Object.keys(answerKey).length === 0) {
    showToast("कृपया मास्टर कुंजी में कम से कम सही उत्तर सेट करें!", "warning");
    return;
  }

  const resPanel = document.getElementById("resultsPanel");
  if (resPanel) resPanel.style.display = "none";

  // फाइल को सुपरफास्ट और हाई-कंट्रास्ट मोड में तैयार करना
  const fileToSend = await compressImageForFastScan(selectedOmrFile);

  const fd = new FormData();
  fd.append("file", fileToSend);
  fd.append("answer_key", JSON.stringify(answerKey));
  fd.append("total_q", questionCount);

  try {
    const res = await fetch(`${BACKEND_URL}/api/scan`, {
      method: "POST",
      body: fd
    });

    const data = await res.json();

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

  const scoreEl = document.getElementById("scoreDisplay");
  if (scoreEl) scoreEl.innerText = `${s.score} / ${s.total_questions}`;
  
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
