# System Architecture & Technical Specifications

## Architectural Overview
The **AegisMed Hospital Medical Diagnosis Expert System** is built on a modern, decoupled microservice architecture comprising four core tiers:

1. **Frontend Tier (`frontend_flutter/` & `web_app_live/`)**: Cross-platform UI created with Flutter and an interactive live web application dashboard for live demonstration.
2. **Backend Services Tier (`backend_springboot/`)**: Java Spring Boot REST API providing user authentication, patient record management, consultation persistence, and report generation.
3. **Inference Engine Tier (`expert_system/`)**: Python REST service executing declarative relational logic programming powered by the **Kanren** library (`Relation`, `facts`, `var`, `run`, `lall`, `conde`, `eq`).
4. **Dynamic Knowledge Base Tier (`knowledge_base/`)**: Canonical single-file clinical knowledge module (`rules.py`) with embedded disease, symptom, alias, recommendation, test, severity, and contraindication metadata.

---

## Logical Flow Diagram

```
+--------------------------+       REST / JSON      +--------------------------+
|  Flutter / Web UI Client | <--------------------> |  Spring Boot Backend API |
+--------------------------+                        +--------------------------+
                                                                 |
                                                            REST | HTTP
                                                                 v
                                                    +--------------------------+
                                                    | Python Kanren REST Engine|
                                                    +--------------------------+
                                                                 |
                                                    Loads Facts  v
                                                    +--------------------------+
                                                    | Dynamic Knowledge Base   |
                                                    | (JSON & rules.py)        |
                                                    +--------------------------+
```

---

## Key Features & Explainable Inference
- **Declarative Relational Rules**: Logic relations (`disease_symptom`, `disease_risk`, `disease_severity`) are defined in Kanren syntax.
- **Adaptive Clinical Interview**: Dynamically generates discriminating follow-up questions to minimize total questions asked while maximizing diagnostic precision.
- **Explainable Reasoning**: Returns exact step-by-step traces of matched facts, weights, and rules.
- **Patient Safety**: Automatic evaluation of drug contraindications against pregnancy, kidney/liver impairment, and documented allergies.
