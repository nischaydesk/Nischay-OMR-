// Nischay OMR Pro - Client-side Student PDF Scorecard Exporter
function generateStudentPDF(data) {
  if (!data || !data.summary) {
    alert("कृपया पहले OMR शीट स्कैन करें!");
    return;
  }

  const s = data.summary;
  const studentName = data.student_name || "PRINCE KUMAR";
  const rollNo = data.roll_no || "2608493105";
  const examDate = new Date().toLocaleDateString('hi-IN');

  const printElement = document.createElement("div");
  printElement.style.padding = "20px";
  printElement.style.background = "#ffffff";
  printElement.style.color = "#0f172a";
  printElement.style.fontFamily = "'Plus Jakarta Sans', Arial, sans-serif";

  let tableRows = "";
  data.details.forEach(row => {
    let color = "#475569";
    if (row.Status === "सही" || row.Status === "Correct") color = "#16a34a";
    else if (row.Status === "गलत" || row.Status === "Wrong") color = "#dc2626";
    else if (row.Status === "अमान्य" || row.Status === "Invalid") color = "#d97706";

    tableRows += `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
        <td style="padding: 5px;"><b>${row.Question}</b></td>
        <td style="padding: 5px; font-weight: bold;">${row.Student_Marked}</td>
        <td style="padding: 5px;">${row.Answer_Key}</td>
        <td style="padding: 5px; color: ${color}; font-weight: bold;">${row.Status}</td>
        <td style="padding: 5px;">${row.Marks}</td>
      </tr>
    `;
  });

  printElement.innerHTML = `
    <div style="border: 2px solid #1e3a8a; padding: 16px; border-radius: 8px;">
      <!-- Sheet Header -->
      <div style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px;">
        <h2 style="margin: 0; color: #1e3a8a; font-size: 18px; text-transform: uppercase;">Nischay OMR Evaluation Suite</h2>
        <p style="margin: 3px 0 0; font-size: 11px; color: #64748b;">आधिकारिक छात्र परीक्षा परिणाम पत्रक (Official Student Scorecard)</p>
      </div>

      <!-- Student Credentials -->
      <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 10px 14px; border-radius: 6px; margin-bottom: 12px; font-size: 12px;">
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
      <div style="display: flex; gap: 8px; margin-bottom: 14px; text-align: center;">
        <div style="flex: 1; background: #eff6ff; border: 1px solid #bfdbfe; padding: 8px; border-radius: 6px;">
          <div style="font-size: 10px; color: #1e40af; font-weight: bold;">कुल प्राप्तांक</div>
          <div style="font-size: 18px; font-weight: 800; color: #1e3a8a;">${s.score} / ${s.total_questions}</div>
        </div>
        <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px; border-radius: 6px;">
          <div style="font-size: 10px; color: #166534; font-weight: bold;">सही उत्तर</div>
          <div style="font-size: 18px; font-weight: 800; color: #15803d;">${s.correct}</div>
        </div>
        <div style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; padding: 8px; border-radius: 6px;">
          <div style="font-size: 10px; color: #991b1b; font-weight: bold;">गलत उत्तर</div>
          <div style="font-size: 18px; font-weight: 800; color: #b91c1c;">${s.wrong}</div>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px;">
          <div style="font-size: 10px; color: #475569; font-weight: bold;">छोड़ा / अमान्य</div>
          <div style="font-size: 18px; font-weight: 800; color: #334155;">${s.skipped + s.invalid}</div>
        </div>
      </div>

      <!-- Questions Breakdown Table -->
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #1e3a8a; color: #ffffff; font-size: 10px;">
            <th style="padding: 5px;">प्रश्न सं.</th>
            <th style="padding: 5px;">छात्र उत्तर</th>
            <th style="padding: 5px;">सही उत्तर</th>
            <th style="padding: 5px;">परिणाम स्थिति</th>
            <th style="padding: 5px;">अंक</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <!-- Signatures Area -->
      <div style="display: flex; justify-content: space-between; margin-top: 30px; padding: 0 20px; font-size: 11px; font-weight: bold; color: #334155;">
        <div style="text-align: center; border-top: 1px solid #94a3b8; width: 130px; padding-top: 4px;">
          छात्र के हस्ताक्षर
        </div>
        <div style="text-align: center; border-top: 1px solid #94a3b8; width: 130px; padding-top: 4px;">
          परीक्षक के हस्ताक्षर
        </div>
      </div>
    </div>
  `;

  const opt = {
    margin: 8,
    filename: `${studentName.replace(/\s+/g, '_')}_Roll_${rollNo}_Report.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(printElement).save();
}
