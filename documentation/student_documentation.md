# MEDICAL DIAGNOSIS AND CLINICAL TRIAGE SYSTEM
## Student Project Documentation

---

## 1. PROJECT OVERVIEW

The Medical Diagnosis and Clinical Triage System is an interactive web-based expert system designed to assist healthcare professionals and medical students in diagnosing common diseases. The system uses a logical reasoning engine powered by medical facts and rules to evaluate reported symptoms, ask targeted follow-up questions, and recommend appropriate confirmation tests and treatments.

The project aims to make clinical triage structured, accurate, and easy to use, while reducing errors in preliminary medical evaluation.

---

## 2. PROBLEM STATEMENT AND OBJECTIVE

In many healthcare settings, primary care clinicians and nurses need to quickly evaluate patients presenting with overlapping symptoms such as fever, headache, body aches, and fatigue. Manual triage can sometimes overlook secondary symptoms or delay appropriate laboratory testing.

The objective of this project is to build an expert system that:
1. Accepts initial presenting symptoms from a clinician.
2. Identifies the top candidate diseases matching those symptoms.
3. Asks targeted follow-up questions for the top candidate diseases in order of priority.
4. Provides final differential diagnoses with ICD-10 codes, confidence scores, recommended laboratory tests, and first-aid advice.
5. Allows clinicians to input confirmation test results (positive or negative) to reach a definitive diagnosis.

---

## 3. MAIN SYSTEM FEATURES

### 3.1 User Authentication and Account Persistence
- Clinician Registration: Allows new users to register an account by entering their full name, medical email address, facility name, and password.
- Account Sign In: Existing clinicians can sign in using their registered email and password. Accounts are saved in local browser storage so credentials persist across page reloads.
- Password Reset: Includes a password reset request modal for clinicians who forget their passwords.

### 3.2 Main Workspace Layout
- Top Bar: Displays system status, active engine connection, and quick navigation.
- Collapsible Sidebar: Displays clinician profile details (name, email, facility, role) with a toggle button to collapse the sidebar into icon view. Contains a Sign Out button at the bottom.
- Main Workspace: Divided into symptom selection, targeted questioning, and final diagnosis output sections.

### 3.3 Phase 1: Symptom Selection
- Primary Symptoms: Clinicians can select common symptoms across categories such as Systemic, Respiratory, Gastrointestinal, Neurological, Dermatological, and Cardiovascular.
- Risk Factors: Clinicians can select relevant patient risk factors such as recent travel, vector exposure, or unboiled water consumption.
- Custom Symptoms: Provides an optional text box for entering additional clinical notes or unlisted symptoms.

### 3.4 Phase 2: Sequential Targeted Questioning
- The system analyzes selected symptoms and selects the top candidate diseases.
- Questions are presented sequentially for each top disease, starting with the least likely candidate and progressing to the most likely candidate.
- Question cards present simple Yes or No choices.
- Pagination displays at most 5 questions per page when total questions exceed 5.

### 3.5 Phase 3: Diagnosis and Confirmation Testing
- Primary Diagnosis Display: Shows the leading candidate condition, ICD-10 code, confidence percentage, category, description, and first-aid recommendations.
- Differential Candidates List: Displays remaining potential candidate conditions and eliminated candidate conditions with clear reasoning.
- Confirmation Testing Panel: Enables clinicians to record test outcomes (Test Positive or Test Negative).
- Confirmed Diagnosis Mode: If a test is positive, the system locks the diagnosis, displays indicated therapeutic medications, and instructs the user to cease further testing.
- Ruled Out Mode: If all candidate conditions test negative, the system displays a clear notice recommending an expanded diagnostic panel or specialist referral.

---

## 4. HOW THE SYSTEM WORKS (STEP-BY-STEP FLOW)

Step 1: Account Access
The user opens the application and lands on the light-themed Clinician Portal. The user signs in with an existing account or creates a new account.

Step 2: Workspace Launch
Upon successful sign-in, the system loads the main workspace and displays the clinician name and facility in the collapsible sidebar.

Step 3: Entering Symptoms
The clinician selects presenting patient symptoms (for example: High Fever, Chills, and Sweating) and clicks the Run Clinical Inference button.

Step 4: Answering Follow-up Questions
The system identifies candidate conditions (such as Malaria, Typhoid Fever, and Dengue Fever) and generates targeted Yes/No follow-up questions for each condition sequentially.

Step 5: Reviewing Differential Output
After questions are answered, the system displays the leading diagnosis card, confidence score, recommended laboratory tests (such as Blood Smear or Widal Test), and urgency level.

Step 6: Recording Test Results
The clinician enters the laboratory test result:
- Test Positive: Confirms the disease, displays medication guidelines, and completes the workflow.
- Test Negative: Eliminates the tested disease, moves to the next candidate condition, or notifies the clinician if all candidates have been ruled out.

---

## 5. SYSTEM ARCHITECTURE AND COMPONENTS

### 5.1 Knowledge Base (Python Kanren Logic Engine)
- Facts File: Defines medical conditions, ICD-10 codes, categories, descriptions, first-aid measures, treatment options, and recommended tests.
- Rules File: Implements relational logical rules that match patient symptoms against disease profiles.
- Questions File: Maps specific disease symptoms to clinical questions.

### 5.2 Expert System REST API (Python Flask / FastAPI)
- Endpoint /api/v1/diagnose: Accepts patient symptoms and risk factors, runs logical inference, and returns ranked diagnoses.
- Endpoint /api/v1/next-questions: Generates targeted follow-up questions for candidate diseases.
- Endpoint /api/v1/testing-result: Evaluates positive or negative lab test outcomes and updates the remaining differential list.

### 5.3 Web Interface (HTML5, Vanilla CSS, JavaScript)
- HTML5: Defines clean, accessible structure for forms, question cards, and diagnosis panels.
- Vanilla CSS: Provides a crisp light medical design system with clear typography, spacing, and micro-interactions.
- Client JavaScript (app.js): Manages state, handles API communications, stores clinician accounts locally, and controls page pagination and workflow logic.

---

## 6. VERIFICATION AND TESTING

The system was verified using both automated unit tests and manual user flow checks:
- Automated Tests: Python unit tests in the tests directory verify that the rule evaluator correctly ranks diagnoses, generates questions, and updates differential pools on test results. All 9 unit tests passed successfully.
- Code Validation: JavaScript code was validated using Node.js syntax checks with zero syntax errors.
- User Flow Verification: Verified account creation, sign-in persistence, sequential questioning (Disease 3 to Disease 1), question pagination, and confirmation testing for both positive and negative outcomes.

---

## 7. CONCLUSION

The Medical Diagnosis and Clinical Triage System successfully combines logical reasoning with an intuitive web interface to support clinical decision-making. By organizing triage into symptom entry, sequential targeted questioning, and test result confirmation, the system helps clinicians quickly identify candidate conditions and make informed diagnostic decisions.
