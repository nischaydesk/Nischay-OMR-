// Nischay OMR Pro - Batch & Multi-Page PDF Queue Processing Engine
// Handles 50-60 Sheets sequentially to eliminate 503 & Rate Limit Errors

let batchQueue = [];
let batchResults = [];
let isBatchRunning = false;
let batchTotalCount = 0;
let batchCompletedCount = 0;

// ==========================================
// 1. PDF SPLITTER & FILE QUEUE BUILDER
// ==========================================
async function prepareBatchQueue(file) {
  batchQueue = [];
  batchResults = [];
  batchCompletedCount = 0;

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    showToast("PDF के पेजों को अलग किया जा रहा है...", "info");
    
    // PDF.js लोड चेक
    if (typeof pdfjsLib === "undefined") {
      await loadPdfJsLibrary();
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    batchTotalCount = pdf.numPages;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x स्केलिंग साफ़ विज़न के लिए
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      // कैनवास से इमेज ब्लॉब (Blob) बनाना
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.92));
      const pageFile = new File([blob], `Sheet_Page_${pageNum}.jpg`, { type: "image/jpeg" });

      batchQueue.push({
        index: pageNum,
        name: `पेज ${pageNum}`,
        file: pageFile
      });
    }

    showToast(`PDF में कुल ${batchTotalCount} कॉपियाँ पाई गईं। बैच प्रोसेसिंग तैयार!`, "success");
    return true;
  } else {
    // अगर सिंगल फ़ोटो है तो बैच में सिर्फ 1 आइटम
    batchTotalCount = 1;
    batchQueue.push({
      index: 1,
      name: file.name,
      file: file
    });
    return false;
  }
}

// ==========================================
// 2. DYNAMIC PDF.JS LOADER (CDN)
// ==========================================
function loadPdfJsLibrary() {
  return new Promise((resolve, reject) => {
    if (typeof pdfjsLib !== "undefined") {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve();
    };
    script.onerror = () => reject(new Error("PDF.js लोड नहीं हो सका"));
    document.head.appendChild(script);
  });
}

// ==========================================
// 3. SEQUENTIAL BATCH SCANNER WITH 2s DELAY
// ==========================================
async function runBatchEvaluation() {
  if (isBatchRunning) return;
  if (!batchQueue.length) {
    showToast("कोई कॉपी कतार में नहीं है!", "warning");
    return;
  }

  isBatchRunning = true;
  const wrap = document.getElementById("progressWrapper");
  if (wrap) wrap.style.display = "block";

  for (let i = 0; i < batchQueue.length; i++) {
    const currentItem = batchQueue[i];
    const pageNum = i + 1;
    const progressPercent = Math.round((i / batchTotalCount) * 100);

    // लाइव स्टेटस अपडेट
    updateBatchStatus(
      progressPercent,
      `कॉपी ${pageNum}/${batchTotalCount} जाँची जा रही है...`,
      `AI विज़न स्कैन सक्रिय: शीट #${pageNum}`
    );

    let success = false;
    let attempts = 0;

    // प्रति शीट 2 बार री-ट्राई
    while (!success && attempts < 2) {
      attempts++;
      try {
        const result = await scanSingleSheetDirect(currentItem.file);
        batchResults.push(result);
        batchCompletedCount++;
        success = true;

        updateBatchStatus(
          Math.round((batchCompletedCount / batchTotalCount) * 100),
          `कॉपी ${pageNum}/${batchTotalCount} सफल!`,
          `छात्र: ${result.student_name || 'छात्र'} (प्राप्तांक: ${result.summary.score}/${result.summary.total_questions})`
        );
      } catch (err) {
        if (attempts >= 2) {
          // अगर फेल हो जाए तो स्किप करके एरर रिकॉर्ड जोड़ें
          batchResults.push({
            student_name: `अस्पष्ट कॉपी #${pageNum}`,
            roll_no: "N/A",
            summary: { score: 0, total_questions: questionCount, correct: 0, wrong: 0, invalid: 0, skipped: questionCount },
            details: []
          });
          batchCompletedCount++;
        } else {
          // 503 या स्पाइक से बचने के लिए 2.5 सेकंड का अतिरिक्त विराम
          await new Promise(r => setTimeout(r, 2500));
        }
      }
    }

    // Google API Quota व 503 से बचने के लिए 2 सेकंड का सुरक्षित ब्रेक (Delay)
    if (i < batchQueue.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // पूरा बैच खत्म
  isBatchRunning = false;
  updateBatchStatus(100, "संपूर्ण बैच संपन्न!", `कुल ${batchCompletedCount} कॉपियाँ सफलतापूर्वक जाँची गईं।`);
  
  // आखिरी जाँची गई कॉपी का रिजल्ट स्क्रीन पर दिखाएं
  if (batchResults.length > 0) {
    evaluationResult = batchResults[batchResults.length - 1];
    renderResults(evaluationResult);
  }

  showToast(`बैच पूरा हुआ! कुल ${batchTotalCount} कॉपियाँ जाँची गईं।`, "success");
  
  // कंबाइंड क्लास समरी बटन दिखाएं
  showBatchSummaryButton();
}

// ==========================================
// 4. API CALL WORKER FOR SINGLE SHEET
// ==========================================
async function scanSingleSheetDirect(fileBlob) {
  const fd = new FormData();
  fd.append("file", fileBlob);
  fd.append("answer_key", JSON.stringify(answerKey));
  fd.append("total_q", questionCount);

  const res = await fetch(`${BACKEND_URL}/api/scan`, {
    method: "POST",
    body: fd
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "API Error");
  }
  return data;
}

// ==========================================
// 5. BATCH STATUS CONTROLLER
// ==========================================
function updateBatchStatus(percent, title, desc) {
  const fill = document.getElementById("progressBarFill");
  const text = document.getElementById("progressPercentText");
  const stTitle = document.getElementById("progressStateTitle");
  const stDesc = document.getElementById("progressStatusDetail");

  if (fill) fill.style.width = percent + "%";
  if (text) text.innerText = percent + "%";
  if (stTitle) stTitle.innerText = title;
  if (stDesc) stDesc.innerText = desc;
}

// कंबाइंड क्लास मेरिट लिस्ट एक्सेल डाउनलोड बटन जोड़ना
function showBatchSummaryButton() {
  if (batchResults.length <= 1) return;

  let btn = document.getElementById("btnCombinedExcel");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btnCombinedExcel";
    btn.className = "btn-action";
    btn.style.background = "#059669";
    btn.style.marginTop = "8px";
    btn.innerHTML = `📊 पूरी क्लास की मेरिट लिस्ट (${batchResults.length} छात्र) एक्सेल डाउनलोड करें`;
    btn.onclick = downloadCombinedClassExcel;

    const resPanel = document.getElementById("resultsPanel");
    if (resPanel) {
      resPanel.insertBefore(btn, resPanel.firstChild);
    }
  }
}

// ==========================================
// 6. COMBINED MERIT LIST EXCEL GENERATOR
// ==========================================
function downloadCombinedClassExcel() {
  if (!batchResults.length) return;

  let csvContent = "\uFEFFरैंक,रोल नंबर,छात्र का नाम,कुल प्राप्तांक,कुल प्रश्न,प्रतिशत,स्थिति\n";

  // अंकों के आधार पर मेरिट रैंक
  const sorted = [...batchResults].sort((a, b) => b.summary.score - a.summary.score);

  sorted.forEach((item, idx) => {
    const s = item.summary;
    const name = (item.student_name || "छात्र").replace(/,/g, " ");
    const roll = item.roll_no || "N/A";
    const pct = ((s.score / s.total_questions) * 100).toFixed(1);
    const status = pct >= 33 ? "उत्तीर्ण (PASS)" : "अनुत्तीर्ण (FAIL)";

    csvContent += `${idx + 1},${roll},${name},${s.score},${s.total_questions},${pct}%,${status}\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = window.URL.createObjectURL(blob);
  a.download = `Nischay_Class_Merit_List_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  showToast("क्लास मेरिट लिस्ट सफलतापूर्वक डाउनलोड हो गई!", "success");
}
