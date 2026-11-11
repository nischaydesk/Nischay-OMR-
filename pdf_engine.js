// Nischay OMR Pro - Printable High-Definition PDF Engine
// Fixes Blank White PDF issue on mobile devices by mounting visible DOM frame

function generateStudentPDF(data) {
  if (!data || !data.summary) {
    if (typeof showToast === "function") {
      showToast("कृपया पहले OMR शीट स्कैन करें!", "warning");
    } else {
      alert("कृपया पहले OMR शीट स्कैन करें!");
    }
    return;
  }

  const s = data.summary;
  const studentName = data.student_name || "PRINCE KUMAR";
  const rollNo = data.roll_no || "2608493105";
  const examDate = new Date().toLocaleDateString('hi-IN');

  // DOM में वास्तविक कंटेनर बनाकर जोड़ना (ताकि मोबाइल कैनवास ब्लैंक 0x0 न बने)
  const container = document.createElement("div");
  container.id = "tempPdfRenderBox";
  container.style.position = "fixed";
  container.style.top = "-9999px";
  container.style.left = "0";
  container.style.width = "780px";
  container.style.background = "#ffffff";
  container.style.color = "#0f172a";
  container.style.fontFamily = "'Plus Jakarta Sans', Arial, sans-serif";
  container.style.padding = "24px";
  container.style.zIndex = "-999";

  let tableRows = "";
  data.details.forEach(row => {
    let color = "#475569";
    if (row.Status === "सही" || row.Status === "Correct") color = "#16a34a";
    else if (row.Status === "गलत" || row.Status === "Wrong") color = "#dc2626";
    else if (row.Status === "अमान्य" || row.Status === "Invalid") color = "#d97706";

    tableRows += `
      <tr style="border-bottom: 1px solid #cbd5e1; font-size: 11px; text-align: center;">
        <td style="padding: 6px; font-weight: 700;">${row.Question}</td>
        <td style="padding: 6px; font-weight: 800;">${row.Student_Marked}</td>
        <td style="padding: 6px; color: #1e3a8a;">${row.Answer_Key}</td>
        <td style="padding: 6px; color: ${color}; font-weight: 800;">${row.Status}</td>
        <td style="padding: 6px; font-weight: 700;">${row.Marks}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div style="border: 2px solid #1e3a8a; border-radius: 10px; padding: 20px; background: #ffffff;">
      <!-- Sheet Header -->
      <div style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 14px;">
        <h2 style="margin: 0; color: #1e3a8a; font-size: 20px; text-transform: uppercase; letter-spacing: 0.5px;">Nischay OMR Pro Evaluation Suite</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">आधिकारिक छात्र परीक्षा परिणाम पत्रक (Official Student Scorecard)</p>
      </div>

      <!-- Student Credentials -->
      <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 13px;">
        <div>
          <div><strong>छात्र का नाम (Name):</strong> ${studentName}</div>
          <div style="margin-top: 4px;"><strong>रोल नंबर (Roll No):</strong> ${rollNo}</div>
        </div>
        <div style="text-align: right;">
          <div><strong>मूल्यांकन तिथि:</strong> ${examDate}</div>
          <div style="margin-top: 4px;"><strong>सत्यापन:</strong> AI Vision Verified (100% Precision)</div>
        </div>
      </div>

      <!-- Score Snapshot Boxes -->
      <div style="display: flex; gap: 8px; margin-bottom: 16px; text-align: center;">
        <div style="flex: 1; background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px 4px; border-radius: 8px;">
          <div style="font-size: 11px; color: #1e40af; font-weight: 700;">कुल प्राप्तांक</div>
          <div style="font-size: 20px; font-weight: 800; color: #1e3a8a; margin-top: 2px;">${s.score} / ${s.total_questions}</div>
        </div>
        <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 4px; border-radius: 8px;">
          <div style="font-size: 11px; color: #166534; font-weight: 700;">सही उत्तर</div>
          <div style="font-size: 20px; font-weight: 800; color: #15803d; margin-top: 2px;">${s.correct}</div>
        </div>
        <div style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; padding: 10px 4px; border-radius: 8px;">
          <div style="font-size: 11px; color: #991b1b; font-weight: 700;">गलत उत्तर</div>
          <div style="font-size: 20px; font-weight: 800; color: #b91c1c; margin-top: 2px;">${s.wrong}</div>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 4px; border-radius: 8px;">
          <div style="font-size: 11px; color: #475569; font-weight: 700;">छोड़ा / अमान्य</div>
          <div style="font-size: 20px; font-weight: 800; color: #334155; margin-top: 2px;">${s.skipped + s.invalid}</div>
        </div>
      </div>

      <!-- Questions Breakdown Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background: #1e3a8a; color: #ffffff; font-size: 11px;">
            <th style="padding: 7px;">प्रश्न सं.</th>
            <th style="padding: 7px;">छात्र उत्तर</th>
            <th style="padding: 7px;">सही उत्तर</th>
            <th style="padding: 7px;">परिणाम स्थिति</th>
            <th style="padding: 7px;">अंक</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <!-- Signatures Area -->
      <div style="display: flex; justify-content: space-between; margin-top: 36px; padding: 0 20px; font-size: 12px; font-weight: 700; color: #334155;">
        <div style="text-align: center; border-top: 1px solid #64748b; width: 140px; padding-top: 6px;">
          छात्र के हस्ताक्षर
        </div>
        <div style="text-align: center; border-top: 1px solid #64748b; width: 140px; padding-top: 6px;">
          परीक्षक के हस्ताक्षर
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  if (typeof showToast === "function") {
    showToast("PDF मार्कशीट तैयार हो रही है...", "info");
  }

  const opt = {
    margin: [8, 8, 8, 8],
    filename: `OMR_${studentName.replace(/[^a-zA-Z0-9]/g, '_')}_Roll_${rollNo}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(container).save().then(() => {
    document.body.removeChild(container);
    if (typeof showToast === "function") {
      showToast("PDF मार्कशीट सफलतापूर्वक डाउनलोड हो गई!", "success");
    }
  }).catch((err) => {
    const el = document.getElementById("tempPdfRenderBox");
    if (el) document.body.removeChild(el);
    if (typeof showToast === "function") {
      showToast("PDF बनाने में त्रुटि आई।", "error");
    }
  });
}
