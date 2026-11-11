// Nischay OMR Pro - Dark / Light Theme & Smooth Navigation Engine
let currentTheme = localStorage.getItem("nischay_omr_theme") || "light";

function toggleTheme() {
  currentTheme = currentTheme === "light" ? "dark" : "light";
  localStorage.setItem("nischay_omr_theme", currentTheme);
  applyTheme();
}

function applyTheme() {
  const body = document.body;
  const themeBtn = document.getElementById("themeToggleBtn");

  if (currentTheme === "dark") {
    body.classList.add("dark-mode");
    if (themeBtn) themeBtn.innerHTML = "☀️ Light Mode";
  } else {
    body.classList.remove("dark-mode");
    if (themeBtn) themeBtn.innerHTML = "🌙 Dark Mode";
  }
}

// स्मूथ स्क्रॉलिंग और Back to Top हेल्पर
function scrollToSection(id) {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// FAQ एकॉर्डियन टॉगल
function toggleFaq(index) {
  const answerEl = document.getElementById(`faq-ans-${index}`);
  const iconEl = document.getElementById(`faq-icon-${index}`);
  if (!answerEl) return;

  if (answerEl.style.display === "block") {
    answerEl.style.display = "none";
    if (iconEl) iconEl.innerText = "+";
  } else {
    answerEl.style.display = "block";
    if (iconEl) iconEl.innerText = "−";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
});
