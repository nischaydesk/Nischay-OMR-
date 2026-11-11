// बैकएंड डिप्लॉय होने पर यहाँ Render का URL आएगा (जैसे 'https://nischay-omr-api.onrender.com')
// लोकल टेस्ट के लिए 'http://127.0.0.1:8000'
const BACKEND_URL = "https://nischay-omr.onrender.com";


let questionCount = 20;
let answerKey = {
  1:'B', 2:'A', 3:'C', 4:'B', 5:'C', 6:'D', 7:'A', 8:'C', 9:'B', 10:'D',
  11:'C', 12:'A', 13:'D', 14:'B', 15:'C', 16:'A', 17:'D', 18:'C', 19:'A', 20:'A'
};
let evaluationResult = null;

function renderMatrix() {
  const container = document.getElementById("matrixContainer");
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
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  for (let i = 1; i <= num; i++) {
    if (!answerKey[i]) answerKey[i] = "A";
  }
  renderMatrix();
}

function triggerCamera() {
  const fi = document.getElementById("fileUpload");
  fi.setAttribute("capture", "environment");
  fi.click();
}

async function onFileSelected() {
  const fi = document.getElementById("fileUpload");
  if (!fi.files[0]) return;

  const fd = new FormData();
  fd.append("file", fi.files[0]);
  fd.append("answer_key", JSON.stringify(answerKey));
  fd.append("total_q", questionCount);

  document.getElementById("loader").style.display = "block";
  document.getElementById("resultsPanel").style.display = "none";

  try {
    const res = await fetch(`${BACKEND_URL}/api/scan`, {
      method: "POST",
      body: fd
    });
    const data = await res.json();
    document.getElementById("loader").style.display = "none";

    if (!res.ok) {
      alert("त्रुटि: " + (data.detail || "स्कैन विफल रहा"));
      return;
    }

    evaluationResult = data;
    renderResults(data);
  } catch (err) {
    document.getElementById("loader").style.display = "none";
    alert("सर्वर से संपर्क नहीं हो सका। बैकएंड चालू है या नहीं जांचें।");
  }
}

function renderResults(data) {
  const s = data.summary;
  document.getElementById("scoreDisplay").innerText = `${s.score} / ${s.total_questions}`;
  document.getElementById("cntCor").innerText = s.correct;
  document.getElementById("cntWro").innerText = s.wrong;
  document.getElementById("cntInv").innerText = s.invalid;
  document.getElementById("cntSkp").innerText = s.skipped;

  let tbl = `<table><tr><th>प्रश्न</th><th>छात्र उत्तर</th><th>सही की</th><th>स्थिति</th></tr>`;
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
  if (!evaluationResult) return;
  const fd = new FormData();
  fd.append("payload", JSON.stringify(evaluationResult));

  try {
    const res = await fetch(`${BACKEND_URL}/api/export-excel`, {
      method: "POST",
      body: fd
    });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = "Nischay_OMR_Marksheet.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    alert("एक्सेल डाउनलोड करने में विफल।");
  }
}

renderMatrix();
