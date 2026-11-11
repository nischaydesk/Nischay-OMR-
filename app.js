// ==========================================
// NISCHAY OMR MASTER ENGINE - FRONTEND LOGIC
// ==========================================

// 1. बैकएंड सर्वर का मुख्य URL (Render लाइव सर्वर)
const BACKEND_URL = "https://nischay-omr.onrender.com";

// ग्लोबल स्टेट वैरिएबल्स
let questionCount = 20;
let selectedOmrFile = null;
let evaluationResult = null;

// डिफ़ॉल्ट मास्टर आंसर की (1 से 100 तक के लिए तैयार)
let answerKey = {
  1:'B', 2:'A', 3:'C', 4:'B', 5:'C', 6:'D', 7:'A', 8:'C', 9:'B', 10:'D',
  11:'C', 12:'A', 13:'D', 14:'B', 15:'C', 16:'A', 17:'D', 18:'C', 19:'A', 20:'A'
};

// 2. मास्टर आंसर की की विज़ुअल ग्रिड (A, B, C, D गोले) रेंडर करना
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

// 3. मास्टर जी द्वारा गोला छूने पर उत्तर अपडेट करना
function selectOption(q, opt) {
  answerKey[q] = opt;
  renderMatrix();
}

// 4. प्रश्न संख्या टैब बदलना (20, 50, 80, 100 सवाल)
function setQuestions(num) {
  questionCount = num;
  
  // टैब स्टाइल अपडेट करना
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (event && event.target) {
    event.target.classList.add('active');
  }

  // नए प्रश्नों के लिए डिफ़ॉल्ट 'A' सेट करना अगर पहले से न हो
  for (let i = 1; i <= num; i++) {
    if (!answerKey[i]) answerKey[i] = "A";
  }

  renderMatrix();
}

// 5. फ़ाइल पिकर और कैमरा ट्रिगर फ़ंक्शंस
function openFilePicker() {
  document.getElementById("fileUpload").click();
}

function openCameraPicker() {
  document.getElementById("cameraUpload").click();
}

// 6. फ़ाइल चुनने के बाद स्क्रीन पर साफ़ प्रीव्यू दिखाना (स्वतः स्कैन नहीं होगा)
function handleFilePreview(e) {
  const file = e.target.files[0];
  if (!file) return;

  selectedOmrFile = file;

  // फ़ाइल का नाम और बैज दिखाना
  const dropText = document.getElementById("dropText");
  const nameBadge = document.getElementById("fileNameDisplay");
  if (dropText) dropText.innerText = "चयनित OMR फ़ाइल:";
  if (nameBadge) {
    nameBadge.innerText = file.name;
    nameBadge.style.display = "inline-block";
  }

  // इमेज प्रीव्यू लोड करना
  const previewBox = document.getElementById("previewContainer");
  const previewImg = document.getElementById("imagePreview");

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      if (previewImg) previewImg.src = evt.target.result;
      if (previewBox) previewBox.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    // अगर कोई PDF या अन्य फ़ाइल चुनी गई हो
    if (previewBox) previewBox.style.display = "none";
  }

  // 'शीट स्कैन करें' मुख्य बटन को चालू (Enable) करना
  const btn = document.getElementById("btnStartScan");
  if (btn) {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// 7. मुख्य स्कैनिंग फ़ंक्शन: जब मास्टर जी "शीट स्कैन करें" दबाएँगे
async function executeScan() {
  if (!selectedOmrFile) {
    alert("कृपया पहले OMR शीट की तस्वीर या फ़ाइल चुनें!");
    return;
  }

  const fd = new FormData();
  fd.append("file", selectedOmrFile);
  fd.append("answer_key", JSON.stringify(answerKey));
  fd.append("total_q", questionCount);

  // UI लोडिंग मोड चालू करना
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
      alert("जाँच विफल रही: " + (data.detail || "अमान्य शीट फ़ॉर्मेट"));
      return;
    }

    evaluationResult = data;
    renderResults(data);

    // रिजल्ट दिखने के बाद स्क्रीन को स्मूथ स्क्रॉल करके नीचे ले जाना
    if (resPanel) {
      resPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

  } catch (err) {
    if (loader) loader.style.display = "none";
    if (btnScan) btnScan.disabled = false;
    alert("सर्वर से संपर्क नहीं हो सका। Render सर्वर स्लीप मोड से जागने में 30-40 सेकंड लेता है, कृपया 10 सेकंड बाद दोबारा 'शीट स्कैन करें' दबाएँ।");
  }
}

// 8. OMR परिणाम, समरी कार्ड और प्रश्न-वार तालिका दिखाना
function renderResults(data) {
  const s = data.summary;
  document.getElementById("scoreDisplay").innerText = `${s.score} / ${s.total_questions}`;
  document.getElementById("cntCor").innerText = s.correct;
  document.getElementById("cntWro").innerText = s.wrong;
  document.getElementById("cntInv").innerText = s.invalid;
  document.getElementById("cntSkp").innerText = s.skipped;

  let tbl = `<table><tr><th>प्रश्न</th><th>छात्र उत्तर</th><th>सही उत्तर</th><th>परिणाम</th></tr>`;
  data.details.forEach(row => {
    let cls = "status-skp";
    if (row.Status === "सही") cls = "status-cor";
    else if (row.Status === "गलत") cls = "status-wro";
    else if (row.Status === "अमान्य") cls = "status-inv";

    tbl += `
      <tr>
        <td><b>${row.Question}</b></td>
        <td><b style="font-size:14px;">${row.Student_Marked}</b></td>
        <td>${row.Answer_Key}</td>
        <td class="${cls}">${row.Status}</td>
      </tr>
    `;
  });
  tbl += `</table>`;

  document.getElementById("tableContainer").innerHTML = tbl;
  document.getElementById("resultsPanel").style.display = "block";
}

// 9. एक्सेल (.xlsx) मार्कशीट डाउनलोड करना
async function downloadExcel() {
  if (!evaluationResult) {
    alert("पहले किसी OMR शीट को स्कैन करें!");
    return;
  }

  const fd = new FormData();
  fd.append("payload", JSON.stringify(evaluationResult));

  try {
    const res = await fetch(`${BACKEND_URL}/api/export-excel`, {
      method: "POST",
      body: fd
    });

    if (!res.ok) throw new Error("Excel export error");

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = `Nischay_OMR_Report_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    alert("एक्सेल मार्कशीट डाउनलोड करने में त्रुटि हुई।");
  }
}

// पेज लोड होते ही ग्रिड तैयार करना
window.addEventListener("DOMContentLoaded", () => {
  renderMatrix();
});
