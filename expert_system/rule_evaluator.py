"""Conservative, explainable symptom-based clinical decision support.

This service ranks differentials and recommends confirmation testing; it never
claims to diagnose a patient.  Unasked symptoms remain unknown.
"""
import os
from knowledge_base.rules import KanrenClinicalInference, resolve_custom_symptoms, symptom_name, diseases, recommendations, tests, contraindications, symptoms_dict


class RuleEvaluator:
    TIER_WEIGHTS = {"mandatory": 6.0, "major": 4.0, "supporting": 1.5}

    def __init__(self, kb_dir=None):
        self.kb_dir = kb_dir or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "knowledge_base"))
        self.diseases = diseases
        self.recommendations = recommendations
        self.tests = tests
        self.contraindications = contraindications
        self.symptoms_dict = symptoms_dict
        self.kanren = KanrenClinicalInference()
        self.likely_threshold = 30

    def _name(self, symptom):
        return symptom_name(symptom)

    def evaluate(self, patient_profile, reported_symptoms, denied_symptoms, risk_factors, custom_symptoms_text="", interview_complete=False):
        profile = patient_profile or {}
        reported, aliases = resolve_custom_symptoms(custom_symptoms_text)
        reported |= set(reported_symptoms or ())
        denied = set(denied_symptoms or ()) - reported
        risks_reported = set(risk_factors or ())

        red_flag_map = {"severe_chest_pain": "Severe / sudden chest pain", "unconsciousness": "Loss of consciousness", "severe_breathing_difficulty": "Severe breathing difficulty", "seizures": "Active seizures", "stroke_symptoms": "Possible stroke signs", "uncontrolled_bleeding": "Uncontrolled bleeding"}
        flags = [label for key, label in red_flag_map.items() if key in set(profile.get("red_flags", []))]
        if flags:
            return {"is_emergency_halt": True, "overall_urgency": "Emergency", "emergency_red_flags": flags,
                    "emergency_message": "Emergency warning signs were reported. Seek emergency care now; this tool cannot assess the cause.", "diagnoses": [], "contraindications": []}

        # Kanren is the source of truth for candidate membership and every
        # positive/negative symptom relation below. JSON only supplies labels,
        # display text, test plans, and the weighting policy.
        logic = self.kanren.infer(reported, denied, risks_reported)
        active, eliminated = [], []
        for disease in self.diseases:
            if disease["id"] not in logic["candidate_ids"]:
                continue
            evidence, possible = 0.0, 0.0
            matched, denied_matches, trace = [], [], ["Candidate condition: %s" % disease["name"]]
            for tier, weight in self.TIER_WEIGHTS.items():
                symptoms = self.kanren.symptoms_for(disease["id"], tier)
                possible += len(symptoms) * weight
                hits = logic["evidence"][tier].get(disease["id"], set())
                negatives = logic["denied"][tier].get(disease["id"], set())
                evidence += len(hits) * weight
                evidence -= len(negatives) * weight * 0.8
                matched += list(hits)
                denied_matches += list(negatives)
                for symptom in hits:
                    trace.append("%s feature present: %s (+%.1f evidence)" % (tier.capitalize(), self._name(symptom), weight))
                for symptom in negatives:
                    trace.append("%s feature denied: %s (-%.1f evidence)" % (tier.capitalize(), self._name(symptom), weight * .8))
            risk_hits = logic["risks"].get(disease["id"], set())
            evidence += len(risk_hits) * 2.0
            possible += 2.0 * max(1, len(disease.get("key_risk_factors", [])))
            for factor in risk_hits:
                trace.append("Relevant risk factor: %s (+2.0 evidence)" % factor.replace("_", " "))
            # Evidence strength, not a probability or diagnosis certainty.
            score = round(max(0, min(95, 100 * max(evidence, 0) / max(possible, 1))), 1)
            trigger_hits = set(disease.get("severity_triggers", [])) & reported
            urgency = "Emergency" if trigger_hits or profile.get("fever_degree", 0) >= 40 else disease.get("base_severity", "Normal")
            if profile.get("pain_level", 0) >= 8 and urgency == "Normal": urgency = "Urgent"
            rec = self.recommendations.get(disease["id"], {})
            active.append({"disease_id": disease["id"], "disease_name": disease["name"], "icd10": disease.get("icd10", "R69"),
                "category": disease.get("category", "General"), "description": disease.get("description", ""), "confidence_percentage": score,
                "evidence_label": "support score — not diagnosis probability", "urgency_level": urgency, "reasoning_trace": trace,
                "matched_symptoms": sorted(matched), "denied_relevant_symptoms": sorted(denied_matches),
                "unconfirmed_major_symptoms": sorted((self.kanren.symptoms_for(disease["id"], "mandatory") | self.kanren.symptoms_for(disease["id"], "major")) - reported - denied),
                "first_aid_advice": rec.get("first_aid", "Seek a clinician’s advice and monitor symptoms."), "specialist_referral": rec.get("specialist_referral", "Primary care clinician"),
                "treatment_options": rec.get("treatment_options", []), "lifestyle_guidance": rec.get("lifestyle_guidance"),
                "recommended_tests": self.tests.get(disease["id"], [])})
        active.sort(key=lambda item: item["confidence_percentage"], reverse=True)
        likely = [item for item in active if item["confidence_percentage"] >= self.likely_threshold]
        inconclusive = not likely or likely[0]["confidence_percentage"] < 40
        overall = "Emergency" if any(x["urgency_level"] == "Emergency" for x in active[:3]) else "Urgent" if any(x["urgency_level"] == "Urgent" for x in active[:3]) else "Normal"
        alerts = [ci for ci in self.contraindications if (ci.get("condition") == "pregnancy" and profile.get("is_pregnant"))]

        # Testing is the endpoint of the interview, not a symptom-only
        # diagnosis. A leading condition must have adequate evidence, a useful
        # separation from the runner-up, and no unanswered core/major feature.
        leading = likely[0] if likely else (active[0] if active else None)
        runner_up_score = likely[1]["confidence_percentage"] if len(likely) > 1 else (active[1]["confidence_percentage"] if len(active) > 1 else 0)
        support_gap = round(leading["confidence_percentage"] - runner_up_score, 1) if leading else 0
        core_features_complete = leading is not None and not leading["unconfirmed_major_symptoms"]
        ready_for_testing = bool(interview_complete and leading and leading["confidence_percentage"] >= 50 and support_gap >= 10 and core_features_complete)
        testing_message = ""
        if ready_for_testing:
            testing_message = "The interview has identified %s as the leading condition for confirmation testing. Order the listed tests and have a qualified clinician interpret them; this is not a confirmed diagnosis." % leading["disease_name"]
        elif leading:
            testing_message = "Continue the adaptive interview: the leading condition is not yet sufficiently separated from alternatives for a focused testing referral. A clinician may still order tests sooner based on judgement or urgency."
        return {"is_emergency_halt": False, "is_inconclusive": inconclusive,
                "inconclusive_message": "There is not enough discriminating symptom evidence to rank a leading condition. Continue the interview or arrange clinician assessment.",
                "diagnoses": active, "eliminated_candidates": eliminated, "custom_symptom_alias_matches": aliases,
                "overall_urgency": overall, "contraindications": alerts, "total_diseases_scanned": len(self.diseases),
                "clinical_disclaimer": "Decision support only. Symptoms cannot confirm a diagnosis; a qualified clinician and appropriate tests are required.",
                "ready_for_testing": ready_for_testing, "testing_candidate": leading["disease_id"] if ready_for_testing else None,
                "testing_support_gap": support_gap, "testing_message": testing_message,
                "likely_diseases": likely}

    def _build_likely_sequence(self, candidate_diagnoses):
        return sorted(
            [d for d in candidate_diagnoses if d.get("confidence_percentage", 0) >= self.likely_threshold],
            key=lambda item: item["confidence_percentage"], reverse=True)

    def _enrich_disease(self, d):
        if not isinstance(d, dict):
            return d
        d_id = d.get("disease_id") or d.get("id")
        d_name = d.get("disease_name") or d.get("name")
        d_raw = next((item for item in self.diseases if item["id"] == d_id or item["name"] == d_name), None)
        rec = self.recommendations.get(d_raw["id"], {}) if d_raw else {}
        tests = self.tests.get(d_raw["id"], []) if d_raw else []

        return {
            "disease_id": d_raw["id"] if d_raw else (d_id or d_name),
            "disease_name": d_raw["name"] if d_raw else (d_name or d_id),
            "icd10": d_raw.get("icd10", "R69") if d_raw else d.get("icd10", "R69"),
            "category": d_raw.get("category", "General") if d_raw else d.get("category", "General"),
            "description": d_raw.get("description", "") if d_raw else d.get("description", ""),
            "confidence_percentage": d.get("confidence_percentage", 50.0),
            "urgency_level": d_raw.get("base_severity", "Normal") if d_raw else d.get("urgency_level", "Normal"),
            "first_aid_advice": rec.get("first_aid") or d.get("first_aid_advice") or "Seek medical evaluation and monitor symptoms.",
            "specialist_referral": rec.get("specialist_referral") or d.get("specialist_referral") or "General Practitioner",
            "treatment_options": rec.get("treatment_options") or d.get("treatment_options") or [],
            "recommended_tests": tests if tests else d.get("recommended_tests", [])
        }

    def resolve_testing_result(self, candidate_diagnoses, tested_disease_id, test_outcome, eliminated_candidates=None):
        if eliminated_candidates is None:
            eliminated_candidates = []

        sequence = self._build_likely_sequence(candidate_diagnoses) if candidate_diagnoses else []
        tested = next((d for d in sequence if d.get("disease_id") == tested_disease_id or d.get("id") == tested_disease_id), None)
        if not tested:
            tested = next((d for d in candidate_diagnoses if d.get("disease_id") == tested_disease_id or d.get("id") == tested_disease_id), None)
        if not tested:
            d_raw = next((d for d in self.diseases if d.get("id") == tested_disease_id or d.get("disease_id") == tested_disease_id), None)
            if d_raw:
                tested = {"disease_id": d_raw["id"], "disease_name": d_raw["name"]}
            else:
                tested = {"disease_id": tested_disease_id, "disease_name": str(tested_disease_id).replace("_", " ").title()}

        tested = self._enrich_disease(tested)

        elim_record = {
            "disease_id": tested.get("disease_id") or tested_disease_id,
            "disease_name": tested.get("disease_name"),
            "reason": f"ELIMINATED: Confirmation test returned negative for {tested.get('disease_name')}."
        }
        updated_eliminated = list(eliminated_candidates)
        if not any(e.get("disease_name") == tested.get("disease_name") or e.get("disease_id") == tested.get("disease_id") for e in updated_eliminated):
            updated_eliminated.append(elim_record)

        elim_ids = {e.get("disease_id") or e.get("id") for e in updated_eliminated if e.get("disease_id") or e.get("id")}
        elim_names = {e.get("disease_name") for e in updated_eliminated if e.get("disease_name")}
        elim_ids.add(tested_disease_id)
        if tested and tested.get("disease_name"):
            elim_names.add(tested.get("disease_name"))

        remaining = [d for d in candidate_diagnoses if d.get("disease_id") not in elim_ids and d.get("id") not in elim_ids and d.get("disease_name") not in elim_names]

        if test_outcome.lower() == "positive":
            remaining_enriched = [self._enrich_disease(d) for d in remaining]
            return {
                "final_diagnosis": tested,
                "confirmed_disease": tested,
                "diagnoses": [tested] + remaining_enriched,
                "remaining_candidates": remaining_enriched,
                "eliminated_candidates": eliminated_candidates,
                "message": f"Positive test for {tested['disease_name']} confirms this as the definitive diagnosis. Administer indicated medication and monitor response.",
                "confirmation_message": f"CONFIRMED DIAGNOSIS: {tested['disease_name']}. Cease further diagnostic testing and administer indicated medication.",
                "status": "positive"
            }

        if len(remaining) < 3:
            for d_raw in self.diseases:
                if d_raw["id"] not in elim_ids and d_raw["name"] not in elim_names:
                    candidate_obj = {"disease_id": d_raw["id"], "disease_name": d_raw["name"]}
                    if not any(r.get("disease_id") == d_raw["id"] or r.get("disease_name") == d_raw["name"] for r in remaining):
                        remaining.append(candidate_obj)
                        if len(remaining) >= 5:
                            break

        remaining_enriched = [self._enrich_disease(d) for d in remaining]

        if remaining_enriched:
            return {
                "diagnoses": remaining_enriched,
                "next_test_candidate": remaining_enriched[0],
                "remaining_candidates": remaining_enriched,
                "eliminated_candidates": updated_eliminated,
                "message": f"Test negative for {tested['disease_name']}. Recommending next candidate for testing: {remaining_enriched[0]['disease_name']}.",
                "status": "negative"
            }

        return {
            "diagnoses": [],
            "next_test_candidate": None,
            "message": f"Test negative for {tested['disease_name']}. All candidate diseases matching symptoms have been tested and ruled out.",
            "remaining_candidates": [],
            "eliminated_candidates": updated_eliminated,
            "status": "negative"
        }

        return {
            "diagnoses": [],
            "next_test_candidate": None,
            "message": f"Test negative for {tested['disease_name']}. All candidate diseases matching symptoms have been tested and ruled out.",
            "remaining_candidates": [],
            "eliminated_candidates": updated_eliminated,
            "status": "negative"
        }

