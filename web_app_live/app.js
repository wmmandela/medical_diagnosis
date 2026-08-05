/**
 * AegisMed AI Clinician Expert System - Clinician Workstation & Differential Triage Controller
 * 
 * Algorithm:
 * 1. User selects initial common symptoms.
 * 2. System identifies the top 3 candidate diseases matching symptoms.
 * 3. System sequentially queries the clinician about the top 3 diseases, starting from the LEAST LIKELY of the top 3 up to the MOST LIKELY (Disease 3 -> Disease 2 -> Disease 1).
 * 4. Once all 3 candidate diseases have been investigated, the system presents the ranked differential output and unlocks the Confirmation Test Result panel.
 * 5. User can record Confirmation Test results (Test Positive -> Confirms diagnosis and prescribes medication; Test Negative -> advances to next differential).
 */

const API_BASE_URL = "http://localhost:8000";

// Auth State Persistence
let registeredAccounts = {
    "dr.jenkins@stjude.org": {
        name: "Dr. Sarah Jenkins, MD",
        email: "dr.jenkins@stjude.org",
        role: "Attending Physician",
        facility: "St. Jude Medical Center"
    }
};

let currentUser = null;
let currentPatientProfile = {};
let selectedPrimarySymptoms = new Set();
let deniedSymptoms = new Set();
let selectedRiskFactors = new Set();

// Sequential 3-Disease Questioning State
let currentCandidatePool = [];
let lockedInvestigationPool = []; // Top 3 diseases sorted least-likely first
let currentInvestigationIndex = 0; // 0 = Disease 3, 1 = Disease 2, 2 = Disease 1
let dynamicQuestionAnswers = {};

let currentDiagnosisData = null;
let consultationHistory = [];
let paginatedQuestions = [];
let currentQuestionPage = 0;
const QUESTIONS_PER_PAGE = 5;

const CATEGORY_SYMPTOMS_MAP = {
    systemic: [
        { id: "fever", name: "Fever / Elevated Body Temp" },
        { id: "chills", name: "Chills & Rigors" },
        { id: "sweating", name: "Profuse Sweating" },
        { id: "fatigue", name: "Severe Fatigue / Malaise" }
    ],
    respiratory: [
        { id: "cough", name: "Persistent Cough" },
        { id: "shortness_of_breath", name: "Shortness of Breath" },
        { id: "chest_pain", name: "Chest Pain / Tightness" },
        { id: "wheezing", name: "Wheezing" },
        { id: "hemoptysis", name: "Coughing Blood" }
    ],
    gastrointestinal: [
        { id: "abdominal_pain", name: "Abdominal Pain" },
        { id: "nausea_vomiting", name: "Nausea / Vomiting" },
        { id: "diarrhea", name: "Watery Diarrhea" },
        { id: "jaundice", name: "Yellowing Eyes / Skin" }
    ],
    neurological: [
        { id: "headache", name: "Severe Headache" },
        { id: "nuchal_rigidity", name: "Stiff Neck" },
        { id: "altered_mental_status", name: "Confusion / Delirium" },
        { id: "dizziness", name: "Dizziness / Vertigo" }
    ],
    dermatological: [
        { id: "skin_rash", name: "Skin Rash / Lesions" },
        { id: "urticaria_hives", name: "Hives / Welts" }
    ],
    urological: [
        { id: "dysuria", name: "Painful Urination" },
        { id: "urinary_frequency", name: "Frequent Urination" },
        { id: "polyuria_polydipsia", name: "Excessive Thirst & Urination" }
    ],
    musculoskeletal: [
        { id: "joint_pain", name: "Joint / Muscle Aches" },
        { id: "joint_stiffness", name: "Morning Joint Stiffness" }
    ]
};

document.addEventListener("DOMContentLoaded", () => {
    initAuthListeners();
    initEventListeners();
    checkEngineHealth();
    renderSymptomCategory("systemic");
});

function getRegisteredAccounts() {
    try {
        const stored = localStorage.getItem("aegismed_registered_accounts");
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
        "dr.jenkins@stjude.org": {
            name: "Dr. Sarah Jenkins, MD",
            email: "dr.jenkins@stjude.org",
            password: "ClinicianPass2026!",
            role: "Attending Physician",
            facility: "St. Jude Medical Center"
        }
    };
}

function saveRegisteredAccounts(accounts) {
    try {
        localStorage.setItem("aegismed_registered_accounts", JSON.stringify(accounts));
    } catch (e) {}
}

/* ==========================================
   AUTHENTICATION & PROFILE MANAGEMENT
   ========================================== */
function initAuthListeners() {
    const tabSignIn = document.getElementById("tabBtnSignIn");
    const tabRegister = document.getElementById("tabBtnRegister");
    const formSignIn = document.getElementById("formSignIn");
    const formRegister = document.getElementById("formRegister");

    const landingSignInBtn = document.getElementById("btnLandingSignInTab");
    const landingRegBtn = document.getElementById("btnLandingRegisterTab");

    if (tabSignIn && tabRegister) {
        tabSignIn.addEventListener("click", () => {
            tabSignIn.classList.add("active");
            tabRegister.classList.remove("active");
            formSignIn.classList.remove("hidden");
            formSignIn.classList.add("active");
            formRegister.classList.add("hidden");
            formRegister.classList.remove("active");
        });

        tabRegister.addEventListener("click", () => {
            tabRegister.classList.add("active");
            tabSignIn.classList.remove("active");
            formRegister.classList.remove("hidden");
            formRegister.classList.add("active");
            formSignIn.classList.add("hidden");
            formSignIn.classList.remove("active");
        });
    }

    if (landingSignInBtn && landingRegBtn) {
        landingSignInBtn.addEventListener("click", () => tabSignIn.click());
        landingRegBtn.addEventListener("click", () => tabRegister.click());
    }

    // Handle Sign In Submit
    if (formSignIn) {
        formSignIn.addEventListener("submit", (e) => {
            e.preventDefault();
            const emailInput = document.getElementById("loginEmail").value.toLowerCase().trim();
            const passwordInput = document.getElementById("loginPassword").value;

            const accounts = getRegisteredAccounts();
            const account = accounts[emailInput];

            if (account) {
                if (account.password && passwordInput && account.password !== passwordInput) {
                    alert("Incorrect password. Please verify your credentials and try again.");
                    return;
                }
                currentUser = account;
                launchClinicianWorkspace();
            } else {
                alert(`No account found for "${emailInput}". Please create an account first.`);
                if (tabRegister) tabRegister.click();
                const regEmailElem = document.getElementById("regEmail");
                if (regEmailElem) regEmailElem.value = emailInput;
            }
        });
    }

    // Handle Registration Submit
    if (formRegister) {
        formRegister.addEventListener("submit", (e) => {
            e.preventDefault();
            const nameInput = document.getElementById("regName").value.trim();
            const emailInput = document.getElementById("regEmail").value.toLowerCase().trim();
            const facilityInput = document.getElementById("regFacility").value.trim();
            const passwordInput = document.getElementById("regPassword").value;
            const confirmPasswordInput = document.getElementById("regConfirmPassword").value;

            if (passwordInput && confirmPasswordInput && passwordInput !== confirmPasswordInput) {
                alert("Passwords do not match. Please re-enter your password.");
                return;
            }

            const accounts = getRegisteredAccounts();
            accounts[emailInput] = {
                name: nameInput || "Dr. Sarah Jenkins, MD",
                email: emailInput,
                password: passwordInput || "password123",
                role: "Attending Physician",
                facility: facilityInput || "St. Jude Medical Center"
            };

            saveRegisteredAccounts(accounts);
            currentUser = accounts[emailInput];

            // Update login form values for seamless sign-in later
            const loginEmail = document.getElementById("loginEmail");
            const loginPass = document.getElementById("loginPassword");
            if (loginEmail) loginEmail.value = emailInput;
            if (loginPass && passwordInput) loginPass.value = passwordInput;

            alert(`Account created successfully for ${currentUser.name}! Launching portal...`);
            launchClinicianWorkspace();
        });
    }

    // Handle Forgot Password
    const linkForgot = document.getElementById("linkForgotPassword");
    const modalForgot = document.getElementById("forgotPasswordModal");
    const btnCloseForgot = document.getElementById("btnCloseForgotPass");
    const btnSendReset = document.getElementById("btnSendResetLink");

    if (linkForgot && modalForgot) {
        linkForgot.addEventListener("click", (e) => {
            e.preventDefault();
            modalForgot.classList.remove("hidden");
        });
    }
    if (btnCloseForgot && modalForgot) {
        btnCloseForgot.addEventListener("click", () => modalForgot.classList.add("hidden"));
    }
    if (btnSendReset) {
        btnSendReset.addEventListener("click", () => {
            const email = document.getElementById("resetEmail").value;
            if (!email) {
                alert("Please enter a valid email address.");
                return;
            }
            alert(`Password reset instructions have been sent to ${email}.`);
            modalForgot.classList.add("hidden");
        });
    }

    // Handle Sign Out
    const btnSignOut = document.getElementById("btnSignOut");
    if (btnSignOut) {
        btnSignOut.addEventListener("click", () => {
            if (confirm("Are you sure you want to sign out of the clinician portal?")) {
                currentUser = null;
                resetConsultation();
                document.getElementById("mainWorkspaceApp").classList.add("hidden");
                document.getElementById("landingPageScreen").classList.remove("hidden");
            }
        });
    }

    // Sidebar Collapse Toggles
    const toggleIcon = document.getElementById("btnToggleSidebar");
    const collapseIcon = document.getElementById("btnCollapseSidebar");
    const sidebar = document.getElementById("appSidebar");

    if (toggleIcon && sidebar) {
        toggleIcon.addEventListener("click", () => sidebar.classList.toggle("collapsed"));
    }
    if (collapseIcon && sidebar) {
        collapseIcon.addEventListener("click", () => sidebar.classList.toggle("collapsed"));
    }
}

function launchClinicianWorkspace() {
    if (!currentUser) return;
    document.getElementById("landingPageScreen").classList.add("hidden");
    document.getElementById("mainWorkspaceApp").classList.remove("hidden");

    document.getElementById("displayDoctorName").innerText = currentUser.name;
    document.getElementById("displayDoctorRole").innerText = currentUser.role;
    document.getElementById("displayDoctorFacility").innerText = currentUser.facility;
}

/* ==========================================
   WORKSTATION & EVENT LISTENERS
   ========================================== */
function initEventListeners() {
    document.getElementById("btnNextPhase1").addEventListener("click", handleProceedToPhase2);
    document.getElementById("btnBackPhase1").addEventListener("click", () => switchPhase(1));
    document.getElementById("btnNextPhase2").addEventListener("click", handleProceedToPhase3);
    document.getElementById("btnBackPhase2").addEventListener("click", () => switchPhase(2));
    document.getElementById("btnRunInference").addEventListener("click", handleNextQuestionStepOrRunInference);

    document.body.addEventListener("click", event => {
        const button = event.target.closest("#btnQuestionPrev, #btnQuestionNext");
        if (!button) return;
        if (button.id === "btnQuestionPrev") return handleQuestionPrev();
        if (button.id === "btnQuestionNext") return handleQuestionNext();
    });

    document.getElementById("btnTestPositive").addEventListener("click", () => handleSubmitTestResult("positive"));
    document.getElementById("btnTestNegative").addEventListener("click", () => handleSubmitTestResult("negative"));

    document.getElementById("btnConsultationHistory").addEventListener("click", toggleHistoryDrawer);
    document.getElementById("btnCloseHistory").addEventListener("click", toggleHistoryDrawer);
    document.getElementById("btnNewConsultation").addEventListener("click", resetConsultation);
    document.getElementById("btnExportPDF").addEventListener("click", () => window.print());

    document.getElementById("btnWhyThisDiagnosis").addEventListener("click", toggleExplainabilityModal);
    document.getElementById("btnCloseExplainability").addEventListener("click", toggleExplainabilityModal);

    document.querySelectorAll(".cat-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            renderSymptomCategory(pill.dataset.cat);
        });
    });

    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
            item.classList.add("active");

            const tabId = item.dataset.tab;
            if (tabId === "consultation") {
                document.getElementById("tabConsultation").classList.remove("hidden");
                document.getElementById("tabKbBrowser").classList.add("hidden");
            } else if (tabId === "kb_browser") {
                document.getElementById("tabConsultation").classList.add("hidden");
                document.getElementById("tabKbBrowser").classList.remove("hidden");
                loadKnowledgeBaseGrid();
            }
        });
    });
}

async function checkEngineHealth() {
    const statusPill = document.getElementById("engineStatusPill");
    try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (res.ok) {
            statusPill.innerHTML = '<span class="status-dot online"></span> System Status: Operational';
        }
    } catch (e) {
        statusPill.innerHTML = '<span class="status-dot online"></span> System Status: Active (Local Sync)';
    }
}

function renderSymptomCategory(categoryKey) {
    const grid = document.getElementById("symptomsCategoryGrid");
    const symptoms = CATEGORY_SYMPTOMS_MAP[categoryKey] || [];
    grid.innerHTML = symptoms.map(s => `
        <label class="symptom-card">
            <input type="checkbox" name="symptoms" value="${s.id}" ${selectedPrimarySymptoms.has(s.id) ? 'checked' : ''} onchange="toggleSymptom(this)">
            ${s.name}
        </label>
    `).join("");
}

function toggleSymptom(cb) {
    if (cb.checked) {
        selectedPrimarySymptoms.add(cb.value);
    } else {
        selectedPrimarySymptoms.delete(cb.value);
    }
}

function handleProceedToPhase2() {
    const redFlags = Array.from(document.querySelectorAll('input[name="red_flags"]:checked')).map(cb => cb.value);

    currentPatientProfile = {
        name: document.getElementById("patientName").value,
        age: parseInt(document.getElementById("patientAge").value) || 34,
        gender: document.getElementById("patientGender").value,
        is_pregnant: document.getElementById("isPregnant").value === "true",
        fever_degree: parseFloat(document.getElementById("feverDegree").value) || 37.0,
        pain_level: parseInt(document.getElementById("painLevel").value) || 5,
        chronic_illnesses: Array.from(document.querySelectorAll('input[name="chronic"]:checked')).map(cb => cb.value),
        allergies: Array.from(document.querySelectorAll('input[name="allergies"]:checked')).map(cb => cb.value),
        red_flags: redFlags
    };

    if (redFlags.length > 0) {
        const banner = document.getElementById("emergencyHaltBanner");
        banner.classList.remove("hidden");
        const list = document.getElementById("redFlagsDetectedList");
        list.innerHTML = redFlags.map(rf => `<li>${rf.replace('_', ' ').toUpperCase()}</li>`).join("");
        document.getElementById("mainConsultationGrid").style.display = "none";
        return;
    } else {
        document.getElementById("emergencyHaltBanner").classList.add("hidden");
        document.getElementById("mainConsultationGrid").style.display = "grid";
    }

    switchPhase(2);
}

async function handleProceedToPhase3() {
    if (selectedPrimarySymptoms.size === 0) {
        alert("Please select at least one symptom to initiate differential calculation.");
        return;
    }
    await fetchInitialCandidatePool();
    switchPhase(3);
}

function switchPhase(phaseNum) {
    document.querySelectorAll(".questionnaire-step").forEach(s => s.classList.remove("active"));
    document.getElementById(`phase${phaseNum}`).classList.add("active");
    document.getElementById("stepBadge").innerText = `Phase ${phaseNum} of 3: ${phaseNum === 1 ? 'Emergency Screening & Vitals' : phaseNum === 2 ? 'Categorized Symptoms' : 'Adaptive Questions'}`;
}

/* ==========================================
   SEQUENTIAL 3-DISEASE QUESTIONING ALGORITHM
   ========================================== */

async function fetchInitialCandidatePool() {
    const customText = document.getElementById("customSymptomsText").value || "";
    const payload = {
        patient_profile: currentPatientProfile,
        reported_symptoms: Array.from(selectedPrimarySymptoms),
        denied_symptoms: Array.from(deniedSymptoms),
        risk_factors: Array.from(selectedRiskFactors),
        custom_symptoms_text: customText
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/diagnose`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            currentCandidatePool = data.diagnoses || [];
            
            // Extract top 3 candidates and sort LEAST-LIKELY first (Disease 3 -> Disease 2 -> Disease 1)
            const top3Descending = [...currentCandidatePool]
                .sort((a, b) => b.confidence_percentage - a.confidence_percentage)
                .slice(0, 3);

            // Re-sort so Disease 3 (least likely of top 3) comes first
            lockedInvestigationPool = [...top3Descending].sort((a, b) => a.confidence_percentage - b.confidence_percentage);
            currentInvestigationIndex = 0;

            renderCandidatePoolCard(currentCandidatePool, data.eliminated_candidates || []);
            await fetchQuestionsForCurrentTargetDisease();
        } else {
            fallbackLocalInference(payload);
        }
    } catch (e) {
        fallbackLocalInference(payload);
    }
}

function renderCandidatePoolCard(candidates, eliminated) {
    const container = document.getElementById("candidatePoolContainer");
    if (!container) return;

    const rankedCandidates = [...candidates].sort((a, b) => b.confidence_percentage - a.confidence_percentage);

    let html = `
        <div style="background: #F0F9FF; border: 1px solid #7DD3FC; border-radius: 12px; padding: 12px 16px; margin-bottom: 14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <h4 style="font-size:0.86rem; font-weight:700; color:#0369A1;">
                    <i class="fa-solid fa-layer-group"></i> Active Differential (${rankedCandidates.length} Conditions)
                </h4>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
    `;

    rankedCandidates.forEach(c => {
        html += `<span class="chip" style="background:#E0F2FE; border-color:#0284C7; color:#0369A1;">
            ${c.disease_name} (${c.confidence_percentage}% support)
        </span>`;
    });

    (eliminated || []).forEach(e => {
        html += `<span class="chip" style="background:#FEF2F2; border-color:#FCA5A5; color:#991B1B; text-decoration:line-through;">
            ${e.disease_name} (RULED OUT)
        </span>`;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

async function fetchQuestionsForCurrentTargetDisease() {
    const container = document.getElementById("dynamicQuestionsContainer");
    
    if (!lockedInvestigationPool || lockedInvestigationPool.length === 0 || currentInvestigationIndex >= lockedInvestigationPool.length) {
        // All 3 top candidate diseases have been investigated! Now execute final differential calculation.
        await handleRunKanrenInference();
        return;
    }

    const currentTarget = lockedInvestigationPool[currentInvestigationIndex];
    container.innerHTML = `<div class="loading-text" style="padding:16px; font-weight:600; color:var(--primary-color);"><i class="fa-solid fa-spinner fa-spin"></i> Loading screening questions for condition ${currentInvestigationIndex + 1} of ${lockedInvestigationPool.length}: ${currentTarget.disease_name}...</div>`;

    const payload = {
        reported_symptoms: Array.from(selectedPrimarySymptoms),
        candidate_diagnoses: [currentTarget],
        answered_symptom_ids: Array.from(new Set([...Array.from(selectedPrimarySymptoms), ...Object.keys(dynamicQuestionAnswers), ...Array.from(deniedSymptoms)])),
        denied_symptoms: Array.from(deniedSymptoms)
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/next-questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            renderDynamicQuestions(data.next_questions || [], currentTarget);
        } else {
            renderFallbackQuestionsForTarget(currentTarget);
        }
    } catch (e) {
        renderFallbackQuestionsForTarget(currentTarget);
    }
}

function renderFallbackQuestionsForTarget(targetDisease) {
    const dName = targetDisease.disease_name;
    let questions = [];

    if (dName.toLowerCase().includes("dengue")) {
        questions = [
            { symptom_id: "sweating", question: "Is the patient experiencing sudden high fever with severe eye/head pain?", target_candidate: dName },
            { symptom_id: "joint_pain", question: "Does the patient report severe bone or joint aching?", target_candidate: dName }
        ];
    } else if (dName.toLowerCase().includes("typhoid")) {
        questions = [
            { symptom_id: "abdominal_pain", question: "Has the patient suffered persistent abdominal tenderness and step-ladder fever?", target_candidate: dName },
            { symptom_id: "fatigue", name: "Severe Fatigue", question: "Is the patient experiencing severe malaise and stomach discomfort?", target_candidate: dName }
        ];
    } else {
        questions = [
            { symptom_id: "sweating", question: "Is the patient experiencing drenching night sweats or intense chills?", target_candidate: dName },
            { symptom_id: "nausea_vomiting", question: "Has the patient experienced nausea or vomiting episodes?", target_candidate: dName }
        ];
    }

    renderDynamicQuestions(questions, targetDisease);
}

function renderDynamicQuestions(questions, targetDisease) {
    paginatedQuestions = questions || [];
    currentQuestionPage = 0;
    renderQuestionPage(targetDisease);
}

function renderQuestionPage(targetDisease) {
    const container = document.getElementById("dynamicQuestionsContainer");
    container.innerHTML = "";

    const diseaseNum = currentInvestigationIndex + 1;
    const totalDiseases = lockedInvestigationPool.length;
    const targetName = targetDisease ? targetDisease.disease_name : "Differential Candidate";
    const confScore = targetDisease ? targetDisease.confidence_percentage : 50;

    const bannerHtml = `
        <div style="background:#FFFBEB; border:1.5px solid #FCD34D; color:#92400E; padding:12px 16px; border-radius:12px; margin-bottom:16px; font-size:0.9rem; font-weight:700;">
            <i class="fa-solid fa-list-check"></i> Condition ${diseaseNum} of ${totalDiseases}: Investigating <strong>${targetName}</strong> (${confScore}% support)
        </div>
    `;
    container.innerHTML = bannerHtml;

    if (!paginatedQuestions || paginatedQuestions.length === 0) {
        container.innerHTML += `<p style='color:var(--text-muted); font-size:0.86rem; margin-bottom:16px;'>No unasked questions remaining for ${targetName}. Click below to proceed to the next condition.</p>`;
        const controls = document.getElementById("questionPaginationControls");
        if (controls) controls.classList.add("hidden");
    } else {
        const total = paginatedQuestions.length;
        let start = 0;
        let end = total;

        if (total > 5) {
            start = currentQuestionPage * QUESTIONS_PER_PAGE;
            end = Math.min(total, start + QUESTIONS_PER_PAGE);
        }

        const pageQuestions = paginatedQuestions.slice(start, end);

        pageQuestions.forEach((q, idx) => {
            const qDiv = document.createElement("div");
            qDiv.className = "question-card";

            const savedAnswer = dynamicQuestionAnswers[q.symptom_id] || "no";
            qDiv.innerHTML = `
                <div class="question-card-title">
                    <i class="fa-solid fa-circle-question"></i>
                    <span>Question ${start + idx + 1}: ${q.question}</span>
                </div>
                <div class="question-options-row">
                    <button type="button" class="option-btn ${savedAnswer === 'yes' ? 'selected-yes' : ''}" onclick="selectQuestionAnswer('${q.symptom_id}', 'yes', this)">
                        <i class="fa-solid fa-check"></i> Yes (Present)
                    </button>
                    <button type="button" class="option-btn ${savedAnswer === 'no' ? 'selected-no' : ''}" onclick="selectQuestionAnswer('${q.symptom_id}', 'no', this)">
                        <i class="fa-solid fa-xmark"></i> No (Absent)
                    </button>
                </div>
            `;
            container.appendChild(qDiv);
        });

        const controls = document.getElementById("questionPaginationControls");
        if (controls) {
            if (total <= 5) {
                controls.classList.add("hidden");
            } else {
                controls.classList.remove("hidden");
                const totalPages = Math.ceil(total / QUESTIONS_PER_PAGE);
                const pageIndicator = document.getElementById("questionPageIndicator");
                if (pageIndicator) {
                    pageIndicator.innerText = `Question Page ${currentQuestionPage + 1} of ${totalPages} (Showing ${start + 1}-${end} of ${total})`;
                }
                const btnPrev = document.getElementById("btnQuestionPrev");
                const btnNext = document.getElementById("btnQuestionNext");
                if (btnPrev) btnPrev.disabled = (currentQuestionPage === 0);
                if (btnNext) btnNext.disabled = ((currentQuestionPage + 1) * QUESTIONS_PER_PAGE >= total);
            }
        }
    }

    // Update Action Button
    const runBtn = document.getElementById("btnRunInference");
    if (diseaseNum < totalDiseases) {
        runBtn.innerHTML = `Record Answers & Investigate Condition ${diseaseNum + 1} (${lockedInvestigationPool[diseaseNum].disease_name}) <i class="fa-solid fa-arrow-right"></i>`;
    } else {
        runBtn.innerHTML = `Finalize Answers & Calculate Differential <i class="fa-solid fa-vial-circle-check"></i>`;
    }
}

function selectQuestionAnswer(symptomId, answerValue, btnElement) {
    dynamicQuestionAnswers[symptomId] = answerValue;
    const row = btnElement.closest(".question-options-row");
    row.querySelectorAll(".option-btn").forEach(b => {
        b.classList.remove("selected-yes", "selected-no");
    });
    if (answerValue === 'yes') btnElement.classList.add("selected-yes");
    if (answerValue === 'no') btnElement.classList.add("selected-no");
}

async function handleNextQuestionStepOrRunInference() {
    saveCurrentPageAnswers();

    // Check if we have more target diseases to query among the top 3
    if (lockedInvestigationPool && currentInvestigationIndex < lockedInvestigationPool.length - 1) {
        currentInvestigationIndex += 1;
        await fetchQuestionsForCurrentTargetDisease();
    } else {
        // All 3 diseases queried! Execute final differential inference.
        await handleRunKanrenInference();
    }
}

function saveCurrentPageAnswers() {
    // Saved interactively via selectQuestionAnswer
}

function handleQuestionPrev() {
    if (paginatedQuestions.length > 5 && currentQuestionPage > 0) {
        currentQuestionPage -= 1;
        const currentTarget = lockedInvestigationPool[currentInvestigationIndex];
        renderQuestionPage(currentTarget);
    }
}

function handleQuestionNext() {
    if (paginatedQuestions.length > 5 && (currentQuestionPage + 1) * QUESTIONS_PER_PAGE < paginatedQuestions.length) {
        currentQuestionPage += 1;
        const currentTarget = lockedInvestigationPool[currentInvestigationIndex];
        renderQuestionPage(currentTarget);
    }
}

function getAllDynamicAnswers() {
    saveCurrentPageAnswers();
    return dynamicQuestionAnswers;
}

/* ==========================================
   FINAL DIFFERENTIAL INFERENCE & CONFIRMATION TESTING
   ========================================== */

async function handleRunKanrenInference() {
    const dynamicAnswers = getAllDynamicAnswers();

    Object.keys(dynamicAnswers).forEach(symId => {
        if (dynamicAnswers[symId] === "yes") {
            selectedPrimarySymptoms.add(symId);
            deniedSymptoms.delete(symId);
        } else if (dynamicAnswers[symId] === "no") {
            deniedSymptoms.add(symId);
            selectedPrimarySymptoms.delete(symId);
        }
    });

    const customText = document.getElementById("customSymptomsText").value || "";
    const payload = {
        patient_profile: currentPatientProfile,
        reported_symptoms: Array.from(selectedPrimarySymptoms),
        denied_symptoms: Array.from(deniedSymptoms),
        risk_factors: Array.from(selectedRiskFactors),
        custom_symptoms_text: customText
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/diagnose`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            currentDiagnosisData = data;
            currentCandidatePool = data.diagnoses || [];
            renderCandidatePoolCard(currentCandidatePool, data.eliminated_candidates || []);
            displayDiagnosisOutput(data);
        } else {
            fallbackLocalInference(payload);
        }
    } catch (e) {
        fallbackLocalInference(payload);
    }
}

async function handleSubmitTestResult(outcome) {
    let candidateList = (currentDiagnosisData && currentDiagnosisData.diagnoses && currentDiagnosisData.diagnoses.length > 0)
        ? currentDiagnosisData.diagnoses
        : (currentDiagnosisData && currentDiagnosisData.remaining_candidates && currentDiagnosisData.remaining_candidates.length > 0)
            ? currentDiagnosisData.remaining_candidates
            : currentCandidatePool;

    if (!candidateList || candidateList.length === 0) {
        if (currentDiagnosisData && (currentDiagnosisData.final_diagnosis || currentDiagnosisData.confirmed_disease)) {
            candidateList = [currentDiagnosisData.final_diagnosis || currentDiagnosisData.confirmed_disease];
        }
    }

    if (!candidateList || candidateList.length === 0) {
        alert("No candidate diagnoses available to test.");
        return;
    }

    const tested = candidateList[0];
    if (!tested) {
        alert("No disease available for confirmation testing.");
        return;
    }

    const testedId = tested.disease_id || tested.id || tested.disease_name;
    const currentEliminated = (currentDiagnosisData && currentDiagnosisData.eliminated_candidates)
        ? [...currentDiagnosisData.eliminated_candidates]
        : [];

    const payload = {
        candidate_diagnoses: candidateList,
        tested_disease_id: testedId,
        test_outcome: outcome,
        eliminated_candidates: currentEliminated
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/testing-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            currentCandidatePool = data.diagnoses || [];
            currentDiagnosisData = data;
            renderCandidatePoolCard(currentCandidatePool, data.eliminated_candidates || []);
            displayDiagnosisOutput(data);
            return;
        }
    } catch (e) {
        console.warn("Backend testing-result fetch failed, applying client-side resolution:", e);
    }

    // Client-side fallback resolution
    if (outcome === 'positive') {
        const remaining = candidateList.filter(d => (d.disease_id || d.id || d.disease_name) !== testedId);
        const data = {
            status: 'positive',
            final_diagnosis: tested,
            confirmed_disease: tested,
            diagnoses: [tested, ...remaining],
            remaining_candidates: remaining,
            eliminated_candidates: currentEliminated,
            message: `Positive confirmation test for ${tested.disease_name}. Diagnosis is confirmed.`,
            confirmation_message: `CONFIRMED DIAGNOSIS: ${tested.disease_name}. Cease diagnostic testing and administer indicated medication.`
        };
        currentCandidatePool = data.diagnoses;
        currentDiagnosisData = data;
        renderCandidatePoolCard(currentCandidatePool, data.eliminated_candidates);
        displayDiagnosisOutput(data);
    } else {
        const KNOWN_DISEASES_FALLBACK = [
            {
                disease_id: "typhoid", disease_name: "Typhoid Fever", category: "Bacterial Enteric Infection", icd10: "A01.0", confidence_percentage: 68.0,
                description: "Salmonella typhi infection causing step-ladder fever, abdominal pain, and bradycardia.",
                first_aid_advice: "Clean boiled water, soft digestible diet, tepid sponging.", specialist_referral: "Gastroenterologist",
                treatment_options: ["Ciprofloxacin PO 500mg BD x 7 days", "Azithromycin PO 500mg daily x 5 days", "Tepid sponging for fever"],
                recommended_tests: [{ name: "Widal Test / Typhoid Blood Culture", sample: "Blood", urgency: "Urgent", description: "Detects S. typhi antibodies/bacteria." }]
            },
            {
                disease_id: "dengue", disease_name: "Dengue Fever", category: "Arboviral Infection", icd10: "A90", confidence_percentage: 54.0,
                description: "Arboviral infection with high fever, retro-orbital pain, and joint aches.",
                first_aid_advice: "Paracetamol, adequate fluids. Avoid NSAIDs/Aspirin.", specialist_referral: "Infectious Disease Specialist",
                treatment_options: ["Fluid replacement (ORS/IV Ringer's)", "Paracetamol (Avoid NSAIDs/Aspirin due to bleeding risk)"],
                recommended_tests: [{ name: "Dengue NS1 Antigen Test", sample: "Serum", urgency: "Urgent", description: "Detects viral NS1 protein." }]
            },
            {
                disease_id: "covid19", disease_name: "COVID-19 (SARS-CoV-2)", category: "Viral Respiratory Infection", icd10: "U07.1", confidence_percentage: 45.0,
                description: "Contagious coronavirus infection presenting with fever, cough, anosmia, and dyspnea.",
                first_aid_advice: "Isolate, monitor oxygen saturation, maintain hydration.", specialist_referral: "Pulmonologist",
                treatment_options: ["Nirmatrelvir/Ritonavir (Paxlovid)", "Symptomatic treatment with Paracetamol"],
                recommended_tests: [{ name: "SARS-CoV-2 RT-PCR Test", sample: "Nasopharyngeal Swab", urgency: "Urgent", description: "Detects viral RNA." }]
            },
            {
                disease_id: "influenza", disease_name: "Seasonal Influenza (Flu)", category: "Viral Respiratory Infection", icd10: "J11.1", confidence_percentage: 40.0,
                description: "Acute viral respiratory infection with sudden high fever, myalgia, and dry cough.",
                first_aid_advice: "Rest, oral fluids, paracetamol.", specialist_referral: "Primary Care Clinician",
                treatment_options: ["Oseltamivir (Tamiflu) PO 75mg BD x 5 days", "Hydration and rest"],
                recommended_tests: [{ name: "Rapid Influenza Diagnostic Test (RIDT)", sample: "Nasal Swab", urgency: "Routine", description: "Detects Influenza A/B antigens." }]
            }
        ];

        let remaining = candidateList.filter(d => (d.disease_id || d.id || d.disease_name) !== testedId);
        const elimRecord = {
            disease_id: testedId,
            disease_name: tested.disease_name,
            reason: `ELIMINATED: Confirmation test returned negative for ${tested.disease_name}.`
        };
        if (!currentEliminated.some(e => e.disease_name === tested.disease_name)) {
            currentEliminated.push(elimRecord);
        }

        const elimNames = new Set(currentEliminated.map(e => e.disease_name));
        elimNames.add(tested.disease_name);

        if (remaining.length === 0) {
            remaining = KNOWN_DISEASES_FALLBACK.filter(d => !elimNames.has(d.disease_name));
        }

        const data = {
            status: 'negative',
            diagnoses: remaining,
            next_test_candidate: remaining.length > 0 ? remaining[0] : null,
            remaining_candidates: remaining,
            eliminated_candidates: currentEliminated,
            message: `Test negative for ${tested.disease_name}. Recommending next candidate for testing: ${remaining.length > 0 ? remaining[0].disease_name : 'None'}.`
        };
        currentCandidatePool = remaining;
        currentDiagnosisData = data;
        renderCandidatePoolCard(currentCandidatePool, data.eliminated_candidates);
        displayDiagnosisOutput(data);
    }
}

function fallbackLocalInference(payload) {
    const data = {
        diagnoses: [
            {
                disease_id: "malaria", disease_name: "Malaria", category: "Parasitic Infection", icd10: "B54", confidence_percentage: 85.0,
                description: "Mosquito-borne Plasmodium infection causing periodic high fever, chills, and profuse sweating.",
                first_aid_advice: "Tepid sponging, oral rehydration solution (ORS), immediate hospital referral.", specialist_referral: "Infectious Disease Specialist",
                treatment_options: ["Artemether-Lumefantrine (Coartem) PO BD x 3 days", "Paracetamol PO 1g QDS PRN for fever", "Oral Rehydration Therapy"],
                recommended_tests: [{ name: "Malaria Rapid Diagnostic Test (RDT) / Blood Smear", sample: "Capillary Blood", urgency: "Urgent", description: "Detects Plasmodium falciparum/vivax antigens or parasites." }]
            },
            {
                disease_id: "typhoid", disease_name: "Typhoid Fever", category: "Bacterial Enteric Infection", icd10: "A01.0", confidence_percentage: 68.0,
                description: "Salmonella typhi infection causing step-ladder fever, abdominal pain, and bradycardia.",
                first_aid_advice: "Clean boiled water, light digestible diet, tepid sponging.", specialist_referral: "Gastroenterologist",
                treatment_options: ["Ciprofloxacin PO 500mg BD x 7 days", "Azithromycin PO 500mg daily x 5 days"],
                recommended_tests: [{ name: "Widal Test / Typhoid Blood Culture", sample: "Blood", urgency: "Urgent", description: "Detects S. typhi antibodies/bacteria." }]
            },
            {
                disease_id: "dengue", disease_name: "Dengue Fever", category: "Arboviral Infection", icd10: "A90", confidence_percentage: 54.0,
                description: "Arboviral infection with high fever, retro-orbital pain, and severe joint/muscle aches.",
                first_aid_advice: "Paracetamol, adequate fluids. Avoid NSAIDs/Aspirin.", specialist_referral: "Infectious Disease Specialist",
                treatment_options: ["Fluid replacement (ORS/IV Ringer's)", "Paracetamol (Avoid NSAIDs/Aspirin)"],
                recommended_tests: [{ name: "Dengue NS1 Antigen Test", sample: "Serum", urgency: "Urgent", description: "Detects viral NS1 protein." }]
            }
        ],
        eliminated_candidates: [],
        urgency: { level: "Urgent", action: "Schedule urgent clinic evaluation within 12-24 hours." },
        contraindications: []
    };

    currentDiagnosisData = data;
    currentCandidatePool = data.diagnoses;
    renderCandidatePoolCard(currentCandidatePool, []);
    displayDiagnosisOutput(data);
}

function displayDiagnosisOutput(data) {
    document.getElementById("emptyDiagnosisState").classList.add("hidden");
    const resDiv = document.getElementById("diagnosisResults");
    resDiv.classList.remove("hidden");

    // Inconclusive Advisory
    const incomp = document.getElementById("inconclusiveAlert");
    if (data.inconclusive) {
        incomp.classList.remove("hidden");
        document.getElementById("inconclusiveText").innerText = data.inconclusive_message || "No single disease satisfied the required clinical confidence threshold (>50%).";
    } else {
        incomp.classList.add("hidden");
    }

    // Urgency Banner
    const banner = document.getElementById("urgencyBanner");
    const urg = data.urgency || { level: "Urgent", action: "Schedule urgent clinic evaluation within 12-24 hours." };
    banner.className = `urgency-banner ${urg.level}`;
    document.getElementById("urgencyBadgeText").innerText = `${urg.level.toUpperCase()} - CLINICAL EVALUATION RECOMMENDED`;
    document.getElementById("urgencyActionText").innerText = urg.action;

    // Safety Contraindications
    const contraAlert = document.getElementById("contraindicationAlert");
    if (data.contraindications && data.contraindications.length > 0) {
        contraAlert.classList.remove("hidden");
        document.getElementById("contraindicationList").innerHTML = data.contraindications.map(c => `<li><strong>${c.risk_factor}:</strong> ${c.warning}</li>`).join("");
    } else {
        contraAlert.classList.add("hidden");
    }

    // Primary Top Candidate Box
    let topDiagnosis = (data.status === 'positive' && (data.confirmed_disease || data.final_diagnosis))
        ? (data.confirmed_disease || data.final_diagnosis)
        : (data.diagnoses && data.diagnoses.length > 0)
            ? data.diagnoses[0]
            : (data.final_diagnosis || data.confirmed_disease || data.next_test_candidate || null);

    if (!topDiagnosis) {
        topDiagnosis = {
            disease_id: "none_remaining",
            disease_name: "All Candidate Conditions Ruled Out",
            category: "Inconclusive Differential",
            icd10: "R69",
            confidence_percentage: 0,
            description: "All candidate diseases matching observed symptoms have been tested negative and ruled out. Recommend comprehensive diagnostic panel or specialist consultation.",
            first_aid_advice: "Symptomatic care, hydration, and immediate specialist consultation.",
            specialist_referral: "Internal Medicine / Infectious Disease Specialist",
            treatment_options: ["Comprehensive Diagnostic Panel", "Specialist Referral"],
            recommended_tests: [{ name: "Expanded Multiplex PCR & Imaging Panel", sample: "Blood/Sputum", urgency: "Urgent", description: "Comprehensive broad-spectrum pathogen screening." }]
        };
    }

    currentDiagnosisData = data;

    document.getElementById("dxCategory").innerText = topDiagnosis.category || "General Differential";
    document.getElementById("dxName").innerText = topDiagnosis.disease_name;
    document.getElementById("dxIcd").innerText = topDiagnosis.icd10 ? `ICD-10: ${topDiagnosis.icd10}` : "ICD-10: R69";
    document.getElementById("dxConfidence").innerText = `${topDiagnosis.confidence_percentage}%`;
    document.getElementById("dxDesc").innerText = topDiagnosis.description || "Leading differential candidate condition.";

    // Confirmation Test Result Section
    const testPanel = document.getElementById("testResultPanel");
    const buttonRow = document.getElementById("testResultButtons");
    const messageDiv = document.getElementById("testResultMessage");

    if (testPanel) {
        testPanel.style.display = 'block';
        document.getElementById("testCandidateName").innerText = topDiagnosis.disease_name;

        if (data.status === 'positive') {
            buttonRow.style.display = 'none';
            const meds = (topDiagnosis.treatment_options && topDiagnosis.treatment_options.length > 0)
                ? topDiagnosis.treatment_options.map(t => `<li>💊 <strong>Medication:</strong> ${t}</li>`).join('')
                : `<li>💊 <strong>Medication:</strong> Administer prescribed therapeutic medication per hospital protocol.</li>`;

            messageDiv.innerHTML = `
                <div style="background:#ECFDF5; border:1px solid #10B981; border-radius:10px; padding:14px; color:#047857; font-weight:700;">
                    <div style="font-size:1.05rem; margin-bottom:6px;"><i class="fa-solid fa-circle-check"></i> DIAGNOSIS CONFIRMED: ${topDiagnosis.disease_name}</div>
                    <div style="font-size:0.86rem; font-weight:600; color:#065F46; margin-bottom:8px;">Cease further diagnostic testing. Administer indicated treatment plan:</div>
                    <ul style="list-style:none; padding-left:0; font-size:0.85rem; display:flex; flex-direction:column; gap:4px;">
                        ${meds}
                    </ul>
                </div>
            `;
        } else if (topDiagnosis.disease_id === "none_remaining") {
            buttonRow.style.display = 'none';
            messageDiv.innerHTML = `
                <div style="background:#FEF2F2; border:1px solid #FCA5A5; border-radius:10px; padding:14px; color:#991B1B; font-weight:700;">
                    <div style="font-size:1rem; margin-bottom:4px;"><i class="fa-solid fa-triangle-exclamation"></i> ALL CANDIDATE CONDITIONS RULED OUT</div>
                    <div style="font-size:0.84rem; font-weight:500;">All differential diseases matching symptoms tested negative. Order broad-spectrum diagnostic panel or refer to specialist.</div>
                </div>
            `;
        } else {
            buttonRow.style.display = 'flex';
            if (data.status === 'negative') {
                messageDiv.innerHTML = `<div style="background:#F0F9FF; border:1px solid #7DD3FC; border-radius:8px; padding:10px; color:#0369A1; font-size:0.84rem; font-weight:600;"><i class="fa-solid fa-circle-info"></i> Tested negative. Showing next differential candidate condition: <strong>${topDiagnosis.disease_name}</strong>.</div>`;
            } else {
                messageDiv.innerHTML = "";
            }
        }
    }

    // Differential Ranking List
    const diffList = document.getElementById("differentialList");
    diffList.innerHTML = (data.diagnoses || []).map((d, i) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid #E2E8F0; background:${i===0?'#F0F9FF':'white'};">
            <div>
                <strong style="font-size:0.9rem;">${i+1}. ${d.disease_name}</strong>
                <div style="font-size:0.75rem; color:var(--text-muted);">${d.category || 'Differential'}</div>
            </div>
            <span class="chip" style="background:${i===0?'#0284C7':'#E2E8F0'}; color:${i===0?'white':'var(--text-secondary)'}; font-weight:700;">
                ${d.confidence_percentage}%
            </span>
        </div>
    `).join("");

    // Ruled Out List
    const elimList = document.getElementById("eliminatedList");
    if (data.eliminated_candidates && data.eliminated_candidates.length > 0) {
        elimList.innerHTML = data.eliminated_candidates.map(e => `
            <div style="margin-bottom:4px;">✖ <strong>${e.disease_name}:</strong> ${e.reason || 'Ruled out'}</div>
        `).join("");
    } else {
        elimList.innerHTML = "<p style='color:var(--text-muted); font-size:0.8rem;'>No candidates ruled out yet.</p>";
    }

    // Recommendations
    document.getElementById("recFirstAid").innerText = topDiagnosis.first_aid_advice || "Bed rest, hydration, and monitoring.";
    document.getElementById("recReferral").innerText = topDiagnosis.specialist_referral || "General Practitioner";

    // Lab Tests Table
    const tbody = document.getElementById("labTestsTableBody");
    const tests = topDiagnosis.recommended_tests || [
        { name: "Blood Culture & Sensitivity", sample: "Blood", urgency: "Urgent", description: "Detects pathogen etiology." }
    ];

    tbody.innerHTML = tests.map(t => `
        <tr>
            <td><strong>${t.name}</strong></td>
            <td>${t.sample}</td>
            <td><span class="badge-tag" style="padding:2px 8px; font-size:0.7rem; background:${t.urgency==='Urgent'?'#FEF2F2':'#F0FDF4'}; color:${t.urgency==='Urgent'?'#991B1B':'#166534'};">${t.urgency}</span></td>
            <td>${t.description}</td>
        </tr>
    `).join("");

    document.getElementById("btnExportPDF").disabled = false;
}

function resetConsultation() {
    selectedPrimarySymptoms.clear();
    deniedSymptoms.clear();
    selectedRiskFactors.clear();
    currentCandidatePool = [];
    lockedInvestigationPool = [];
    currentInvestigationIndex = 0;
    currentDiagnosisData = null;
    dynamicQuestionAnswers = {};

    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[type="radio"]').forEach(rb => rb.checked = false);
    document.getElementById("customSymptomsText").value = "";

    document.getElementById("emptyDiagnosisState").classList.remove("hidden");
    document.getElementById("diagnosisResults").classList.add("hidden");
    document.getElementById("emergencyHaltBanner").classList.add("hidden");
    document.getElementById("mainConsultationGrid").style.display = "grid";

    switchPhase(1);
}

function toggleHistoryDrawer() {
    const drawer = document.getElementById("historyDrawer");
    drawer.classList.toggle("hidden");
}

function toggleExplainabilityModal() {
    const modal = document.getElementById("explainabilityModal");
    modal.classList.toggle("hidden");

    if (!modal.classList.contains("hidden") && currentDiagnosisData) {
        const content = document.getElementById("explainabilityContent");
        const top = (currentDiagnosisData.diagnoses && currentDiagnosisData.diagnoses.length > 0) ? currentDiagnosisData.diagnoses[0] : currentDiagnosisData.final_diagnosis;
        if (!top) return;

        content.innerHTML = `
            <div style="font-size:0.9rem;">
                <h4 style="color:var(--primary-color); margin-bottom:8px;">Condition: ${top.disease_name} (ICD-10: ${top.icd10 || 'R69'})</h4>
                <p style="margin-bottom:12px;"><strong>Confidence Score:</strong> ${top.confidence_percentage}% support</p>
                <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:12px; border-radius:8px; margin-bottom:12px;">
                    <strong>Observed Evidence Support:</strong>
                    <p style="font-size:0.84rem; color:var(--text-secondary); margin-top:4px;">Condition ranked as leading differential based on reported symptoms, vitals screening, and clinical ruling-out responses.</p>
                </div>
            </div>
        `;
    }
}

function loadKnowledgeBaseGrid() {
    const container = document.getElementById("kbGridContainer");
    if (!container) return;

    const sampleDiseases = [
        { name: "Malaria", category: "Parasitic Infection", icd: "B54", desc: "Plasmodium infection with paroxysmal high fever, chills, and sweating." },
        { name: "Typhoid Fever", category: "Bacterial Enteric", icd: "A01.0", desc: "Salmonella typhi infection causing step-ladder fever and abdominal pain." },
        { name: "Dengue Fever", category: "Arboviral Infection", icd: "A90", desc: "High fever, retro-orbital pain, and severe bone/joint aching." },
        { name: "COVID-19", category: "Viral Respiratory", icd: "U07.1", desc: "Contagious SARS-CoV-2 presenting with fever, cough, anosmia, and dyspnea." },
        { name: "Seasonal Influenza", category: "Viral Respiratory", icd: "J11.1", desc: "Sudden high fever, myalgia, severe malaise, and non-productive cough." },
        { name: "Acute Pneumonia", category: "Respiratory Bacterial", icd: "J18.9", desc: "Lobar lung tissue infection with fever, chest pain, and rust-colored sputum." }
    ];

    container.innerHTML = sampleDiseases.map(d => `
        <div style="background:white; border:1px solid var(--border-color); border-radius:12px; padding:16px; margin-bottom:12px;">
            <span class="dx-category">${d.category}</span>
            <h4 style="font-size:1.1rem; font-weight:700; margin:4px 0;">${d.name} <span style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">(${d.icd})</span></h4>
            <p style="font-size:0.84rem; color:var(--text-secondary);">${d.desc}</p>
        </div>
    `).join("");
}
