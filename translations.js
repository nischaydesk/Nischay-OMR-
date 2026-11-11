// Nischay OMR Pro - Multi-Language Translation Dictionary (Hindi / English)
const i18nData = {
  hi: {
    brand_sub: "PRO v2.4 AI",
    drawer_theme_title: "थीम मोड",
    drawer_lang_title: "भाषा (Language)",
    drawer_lang_btn: "🌐 English",
    drawer_nav_heading: "मुख्य नेविगेशन",
    drawer_nav_scanner: "स्कैनर कंसोल",
    drawer_nav_how: "हाउ इट वर्क्स (OMR Flow)",
    drawer_nav_help: "सहायता व नीतियां",
    drawer_nav_faq: "FAQ प्रश्नोत्तरी",
    drawer_nav_privacy: "डेटा सुरक्षा (Privacy)",
    drawer_nav_terms: "नियम एवं शर्तें (Terms)",
    sub_nav_scanner: "स्कैनर कंसोल",
    sub_nav_how: "हाउ इट वर्क्स ↗",
    sub_nav_faq: "FAQ ↗",
    sub_nav_privacy: "डेटा सुरक्षा ↗",
    sub_nav_terms: "नियम व शर्तें ↗",
    hero_badge: "⚡ AI-DRIVEN HIGH SPEED SCANNER",
    hero_title: "स्मार्ट डिजिटल OMR मूल्यांकन प्रणाली",
    hero_desc: "बिहार विद्यालय परीक्षा समिति (BSEB) एवं कोचिंग संस्थानों के लिए 100% सटीक AI विज़न OMR चेकर।",
    q_limit_title: "प्रश्नों की संख्या चुनें (Questions Limit)",
    q_limit_sub: "5 से 100 प्रश्न समर्थित",
    tab_20: "20 सवाल",
    tab_50: "50 सवाल",
    tab_80: "80 सवाल",
    tab_100: "100 सवाल",
    custom_q_label: "कस्टम सवाल संख्या:",
    q_unit: "सवाल",
    card1_title: "1. मास्टर उत्तर कुंजी (Answer Key)",
    card1_sub: "गोला छूकर सही उत्तर सेट करें",
    card2_title: "2. छात्र की OMR शीट अपलोड करें",
    btn_upload_file: "📁 डिवाइस फ़ाइलें / Documents चुनें",
    btn_camera: "📷 सीधे कैमरे से फ़ोटो खींचें",
    status_no_file: "अभी तक कोई फ़ाइल नहीं चुनी गई",
    status_file_selected: "चयनित OMR फ़ाइल:",
    btn_start_scan: "🔍 शीट स्कैन शुरू करें",
    prog_starting: "प्रोसेसिंग आरंभ...",
    prog_encoding: "इमेज डेटा तैयार किया जा रहा है...",
    score_title: "कुल प्राप्तांक (TOTAL MARKS)",
    student_prefix: "छात्र:",
    roll_prefix: "रोल:",
    lbl_correct: "सही (+1)",
    lbl_wrong: "गलत (0)",
    lbl_invalid: "अमान्य",
    lbl_skipped: "छोड़ा",
    btn_download_excel: "📥 क्लास मार्कशीट एक्सेल (.xlsx) डाउनलोड करें",
    btn_download_pdf: "📄 छात्र मार्कशीट PDF डाउनलोड करें",
    table_title: "प्रश्न-वार विस्तृत रिपोर्ट",
    th_qno: "Q.No",
    th_student: "छात्र उत्तर",
    th_key: "सही उत्तर",
    th_status: "परिणाम",
    footer_copy: "© 2026 NischayDesk. सर्वाधिकार सुरक्षित।"
  },
  en: {
    brand_sub: "PRO v2.4 AI",
    drawer_theme_title: "Theme Mode",
    drawer_lang_title: "Language",
    drawer_lang_btn: "🌐 हिंदी",
    drawer_nav_heading: "Main Navigation",
    drawer_nav_scanner: "Scanner Console",
    drawer_nav_how: "How It Works (OMR Flow)",
    drawer_nav_help: "Help & Policies",
    drawer_nav_faq: "FAQ Q&A",
    drawer_nav_privacy: "Data Privacy",
    drawer_nav_terms: "Terms of Service",
    sub_nav_scanner: "Scanner Console",
    sub_nav_how: "How It Works ↗",
    sub_nav_faq: "FAQ ↗",
    sub_nav_privacy: "Data Privacy ↗",
    sub_nav_terms: "Terms ↗",
    hero_badge: "⚡ AI-DRIVEN HIGH SPEED SCANNER",
    hero_title: "Smart Digital OMR Evaluation System",
    hero_desc: "100% accurate AI Vision OMR checker designed for BSEB, competitive exams & coaching institutes.",
    q_limit_title: "Select Number of Questions",
    q_limit_sub: "5 to 100 Questions Supported",
    tab_20: "20 Questions",
    tab_50: "50 Questions",
    tab_80: "80 Questions",
    tab_100: "100 Questions",
    custom_q_label: "Custom Question Count:",
    q_unit: "Questions",
    card1_title: "1. Master Answer Key",
    card1_sub: "Tap bubble to set correct answer",
    card2_title: "2. Upload Student OMR Sheet",
    btn_upload_file: "📁 Choose Device Files / Documents",
    btn_camera: "📷 Capture Directly with Camera",
    status_no_file: "No file chosen yet",
    status_file_selected: "Selected OMR File:",
    btn_start_scan: "🔍 Start OMR Scan",
    prog_starting: "Starting processing...",
    prog_encoding: "Encoding image data...",
    score_title: "TOTAL MARKS OBTAINED",
    student_prefix: "Student:",
    roll_prefix: "Roll:",
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
    footer_copy: "© 2026 NischayDesk. All Rights Reserved."
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
  if (!dict) return;

  // सभी data-i18n वाले तत्वों का टेक्स्ट अपडेट करें
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.innerText = dict[key];
    }
  });

  // ड्रावर के अंदर वाले बटन का टेक्स्ट
  const langSwitchBtn = document.getElementById("langSwitchBtn");
  if (langSwitchBtn) {
    langSwitchBtn.innerText = dict["drawer_lang_btn"];
  }

  // अगर कोई टॉप नेव बटन भी हो
  const langToggleBtn = document.getElementById("langToggleBtn");
  if (langToggleBtn) {
    langToggleBtn.innerText = currentLang === "hi" ? "🌐 English" : "🌐 हिंदी";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyLanguage();
});
