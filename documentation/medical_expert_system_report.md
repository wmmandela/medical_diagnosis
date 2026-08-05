# Comprehensive Clinical & Technical Report: Hospital Medical Diagnosis Expert System

## Executive Summary
This project delivers a state-of-the-art **AI-Powered Hospital Medical Diagnosis Expert System** designed to simulate the decision-making process of an expert clinical physician. Utilizing **Kanren** declarative relational logic programming in Python alongside a robust **Java Spring Boot** backend and a **Flutter** cross-platform user interface, the system achieves highly explainable, transparent, and accurate clinical diagnostic inference across more than 30 major medical conditions.

---

## 1. Medical Scope & Disease Coverage
The knowledge base covers over 30 disease categories:
1. **Malaria** (B54) - Periodic high fever, rigors, sweating, headache, mosquito exposure.
2. **Typhoid Fever** (A01.0) - Sustained fever, abdominal pain, rose spots, contaminated water.
3. **Pneumonia** (J18.9) - Productive cough, dyspnea, pleuritic chest pain, lobar infiltrates.
4. **Pulmonary Tuberculosis** (A15.0) - Persistent cough >3 weeks, hemoptysis, night sweats, weight loss.
5. **COVID-19** (U07.1) - Fever, dry cough, anosmia/ageusia, dyspnea.
6. **Seasonal Influenza** (J11.1) - Sudden high fever, myalgia, severe prostration.
7. **Dengue Fever** (A90) - Retro-orbital pain, breakbone arthralgia, skin rash, thrombocytopenia risk.
8. **Cholera** (A00.9) - Profuse rice-water diarrhea, rapid hypovolemic dehydration.
9. **Acute Meningitis** (G03.9) - High fever, nuchal rigidity, photophobia, altered mental status.
10. **Bronchial Asthma** (J45.901) - Episodic wheezing, nocturnal cough, dyspnea.
11. **Acute Bronchitis** (J20.9) - Persistent cough following viral URI.
12. **Acute Rhinosinusitis** (J01.90) - Facial pain/pressure, purulent nasal discharge.
13. **Type 2 Diabetes Mellitus** (E11.9) - Polyuria, polydipsia, polyphagia, weight loss.
14. **Essential Hypertension** (I10) - Occipital headache, elevated BP > 140/90.
15. **Iron Deficiency Anemia** (D50.9) - Fatigue, pallor, exertional dyspnea, microcytic RBCs.
16. **Kidney Failure** (N18.9) - Oliguria/anuria, peripheral edema, elevated creatinine/BUN.
17. **Liver Dysfunction / Acute Hepatitis** (K72.90) - Jaundice, RUQ pain, dark urine.
18. **Peptic Ulcer Disease** (K27.9) - Epigastric burning pain, food-related pain patterns.
19. **Acute Appendicitis** (K35.80) - Migrating RLQ pain, McBurney rebound tenderness.
20. **Acute Cystitis / UTI** (N39.0) - Dysuria, urinary frequency, suprapubic pain.
21. **Sexually Transmitted Infections** (A64) - Purulent discharge, dysuria, mucosal lesions.
22. **HIV Acute Screening** (Z11.4) - Prolonged fever, lymphadenopathy, rash, risk exposure.
23. **Skin Diseases / Impetigo / Dermatitis** (L30.9) - Pruritus, erythema, vesicular crusts.
24. **Acute Allergy / Anaphylaxis** (T78.40) - Urticaria, angioedema, stridor risk.
25. **Migraine Headache** (G43.909) - Unilateral pulsating pain, photophobia, aura.
26. **Arthritis** (M19.90) - Joint swelling, morning stiffness > 30 minutes.
27. **Food Poisoning** (A05.9) - Sudden onset nausea, vomiting, watery diarrhea after meal.
28. **Acute Dehydration** (E86.0) - Dry mucosa, dark urine, orthostatic dizziness.
29. **Bronchiolitis** - Viral lower respiratory tract illness in infants.
30. **Otitis Media** - Acute middle ear infection with otalgia and fever.

---

## 2. Kanren Relational Inference Mechanics
The expert system relies on Kanren relational facts and logic goals:
- `Relation("disease_symptom")`: Maps candidate diseases to symptoms.
- `Relation("disease_risk")`: Maps diseases to predisposing risk factors.
- `Relation("disease_severity")`: Maps base triage urgency levels.

During evaluation, queries are executed via `run(0, d, disease_symptom(d, symptom))` to find all satisfying unifying substitutions for variable `d`.

---

## 3. Conclusion & System Verification
The system has been verified through automated unit tests (`tests/test_kanren_engine.py`) and live interactive web execution, fulfilling all requirements for modularity, explainability, cross-platform UI, and modern clinical decision support.
