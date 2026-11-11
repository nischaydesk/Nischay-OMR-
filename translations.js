// Nischay OMR Pro - Multi-Language Translation Dictionary (Hindi / English)
const i18nData = {
  hi: {
    brand_sub: "PRO v2.4 AI",
    nav_scanner: "स्कैनर कंसोल",
    nav_how: "कैसे काम करता है",
    nav_compare: "AI vs पारंपरिक",
    nav_faq: "FAQ",
    nav_privacy: "डेटा सुरक्षा",
    nav_terms: "नियम व शर्तें",
    hero_badge: "⚡ AI-DRIVEN OMR SUITE 2026",
    hero_title: "स्मार्ट डिजिटल OMR मूल्यांकन प्रणाली",
    hero_desc: "बिहार विद्यालय परीक्षा समिति (BSEB), प्रतियोगी परीक्षाओं एवं कोचिंग संस्थानों के लिए 100% सटीक AI विज़न OMR चेकर।",
    stat_sheets: "50,000+ कॉपियाँ जाँची गईं",
    stat_accuracy: "99.98% सटीकता दर",
    stat_speed: "0.8s औसत गति",
    stat_privacy: "0% सर्वर स्टोरेज (सुरक्षित)",
    tab_20: "20 सवाल",
    tab_50: "50 सवाल",
    tab_80: "80 सवाल",
    tab_100: "100 सवाल",
    card1_title: "1. मास्टर उत्तर कुंजी (Answer Key)",
    card1_sub: "गोला छूकर सही उत्तर सेट करें",
    card2_title: "2. छात्र की OMR शीट या PDF अपलोड करें",
    btn_upload_file: "📁 डिवाइस फ़ाइलें / Documents चुनें",
    btn_camera: "📷 सीधे कैमरे से फ़ोटो खींचें",
    status_no_file: "अभी तक कोई फ़ाइल नहीं चुनी गई",
    btn_start_scan: "🔍 शीट स्कैन शुरू करें",
    prog_starting: "प्रोसेसिंग आरंभ...",
    prog_uploading: "इमेज डेटा AI इंजन पर भेजा जा रहा है...",
    prog_analyzing: "AI विज़न द्वारा बबल्स, नाम और रोल नंबर का विश्लेषण...",
    prog_matching: "मास्टर कुंजी से मिलान जारी है...",
    prog_success: "सफल! परिणाम तैयार है।",
    score_title: "कुल प्राप्तांक (TOTAL MARKS)",
    lbl_correct: "सही (+1)",
    lbl_wrong: "गलत (0)",
    lbl_invalid: "अमान्य",
    lbl_skipped: "छोड़ा",
    btn_download_excel: "📥 क्लास मार्कशीट एक्सेल (.xlsx) डाउनलोड करें",
    btn_download_pdf: "📄 छात्र मार्कशीट PDF डाउनलोड करें",
    table_title: "प्रश्न-वार विस्तृत रिपोर्ट (Question Breakdown)",
    th_qno: "प्रश्न सं.",
    th_student: "छात्र उत्तर",
    th_key: "सही उत्तर",
    th_status: "परिणाम",
    th_marks: "अंक",
    footer_copy: "© 2026 NischayDesk. सर्वाधिकार सुरक्षित।",
    footer_back_top: "वापस ऊपर जाएँ ↑"
  },
  en: {
    brand_sub: "PRO v2.4 AI",
    nav_scanner: "Scanner Console",
    nav_how: "How It Works",
    nav_compare: "AI vs OpenCV",
    nav_faq: "FAQ",
    nav_privacy: "Data Privacy",
    nav_terms: "Terms of Service",
    hero_badge: "⚡ AI-DRIVEN OMR SUITE 2026",
    hero_title: "Smart Digital OMR Evaluation Suite",
    hero_desc: "100% accurate AI Vision OMR checker designed for BSEB, competitive exams, schools and coaching institutes.",
    stat_sheets: "50,000+ Sheets Evaluated",
    stat_accuracy: "99.98% Accuracy Rate",
    stat_speed: "0.8s Avg Scan Time",
    stat_privacy: "0% Server Storage (Safe)",
    tab_20: "20 Questions",
    tab_50: "50 Questions",
    tab_80: "80 Questions",
    tab_100: "100 Questions",
    card1_title: "1. Master Answer Key",
    card1_sub: "Tap bubble to set correct answer",
    card2_title: "2. Upload Student OMR Sheet or PDF",
    btn_upload_file: "📁 Choose Device Files / Documents",
    btn_camera: "📷 Capture Directly with Camera",
    status_no_file: "No file chosen yet",
    btn_start_scan: "🔍 Start OMR Scan",
    prog_starting: "Starting processing...",
    prog_uploading: "Uploading image to AI Engine...",
    prog_analyzing: "AI Vision analyzing bubbles, name & roll number...",
    prog_matching: "Matching with Master Answer Key...",
    prog_success: "Success! Evaluation completed.",
    score_title: "TOTAL MARKS OBTAINED",
    lbl_correct: "Correct (+1)",
    lbl_wrong: "Wrong (0)",
    lbl_invalid: "Invalid",
    lbl_skipped: "Skipped",
    btn_download_excel: "📥 Download Class Marksheet Excel (.xlsx)",
    btn_download_pdf: "📄 Download Student Scorecard PDF",
    table_title: "Question-wise Detailed Breakdown",
    th_qno: "Q.No",
    th_student: "Student Ans",
    th_key: "Correct Key",
    th_status: "Status",
    th_marks: "Marks",
    footer_copy: "© 2026 NischayDesk. All Rights Reserved.",
    footer_back_top: "Back to Top ↑"
  }
};

let currentLang = localStorage.getItem("nischay_omr_lang") || "hi";

function toggleLanguage() {
  currentLang = currentLang === "hi" ? "en" : "hi";
  localStorage.setItem("nischay_omr_lang", currentLang);
  applyLanguage();
}

function applyLanguage() {
  const dict = i18nData[currentLang];
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.innerText = dict[key];
    }
  });

  const langBtn = document.getElementById("langToggleBtn");
  if (langBtn) {
    langBtn.innerHTML = currentLang === "hi" ? "🌐 English" : "🌐 हिंदी";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyLanguage();
});
