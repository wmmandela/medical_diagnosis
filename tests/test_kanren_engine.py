"""
Unit Tests for Clinician-Grade Kanren Relational Engine & Medical Rules
Tests:
1. Emergency Red Flags Triage Halt
2. Mandatory Symptom Elimination
3. Custom Symptom Free-Text Alias Resolution
4. Inconclusive Score Handling (<50%)
"""

import sys
import os
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "expert_system")))
from rule_evaluator import RuleEvaluator
from adaptive_questioner import AdaptiveQuestioner

class TestClinicianKanrenEngine(unittest.TestCase):
    def setUp(self):
        self.evaluator = RuleEvaluator()
        self.questioner = AdaptiveQuestioner()

    def test_emergency_red_flag_halt(self):
        profile = {"age": 45, "sex": "male", "red_flags": ["severe_chest_pain"]}
        res = self.evaluator.evaluate(profile, ["fever"], [], [])
        self.assertTrue(res["is_emergency_halt"])
        self.assertEqual(res["overall_urgency"], "Emergency")

    def test_denied_core_symptom_is_negative_evidence_not_unknown_elimination(self):
        # A denied cough reduces support for TB; it must not be confused with an
        # unasked symptom or cause every candidate to be prematurely removed.
        profile = {"age": 30, "sex": "male"}
        reported = ["fever", "night_sweats", "hemoptysis"]
        denied = ["cough"]
        res = self.evaluator.evaluate(profile, reported, denied, [])
        
        tb = next(d for d in res["diagnoses"] if d["disease_id"] == "tuberculosis")
        self.assertIn("cough", tb["denied_relevant_symptoms"])

    def test_custom_symptom_alias_resolution(self):
        profile = {"age": 28, "sex": "female"}
        custom_text = "Patient is throwing up and has yellow eyes"
        res = self.evaluator.evaluate(profile, ["fever"], [], [], custom_text)
        
        aliases = [a["canonical_id"] for a in res["custom_symptom_alias_matches"]]
        self.assertIn("nausea_vomiting", aliases)
        self.assertIn("jaundice", aliases)

    def test_inconclusive_threshold_handling(self):
        profile = {"age": 20, "sex": "female"}
        # Single non-specific symptom yields <50% confidence
        res = self.evaluator.evaluate(profile, ["fatigue"], [], [])
        self.assertTrue(res["is_inconclusive"])

    def test_questioner_exhausts_major_features_before_supporting_features(self):
        candidates = [{"disease_id": "malaria", "confidence_percentage": 40}]
        questions = self.questioner.generate_next_questions(["fever"], candidates, ["fever"])
        symptom_ids = {question["symptom_id"] for question in questions}
        self.assertEqual(symptom_ids, {"chills", "sweating", "headache", "nausea_vomiting", "fatigue", "joint_pain", "muscle_pain", "diarrhea", "dizziness", "jaundice", "dark_urine", "weakness", "confusion", "cough", "back_pain", "pallor"})
        self.assertTrue(all(question["interview_stage"] == "complete symptom review" for question in questions))

    def test_testing_gate_requires_complete_major_feature_interview(self):
        res = self.evaluator.evaluate({}, ["fever", "chills", "sweating", "headache", "nausea_vomiting", "fatigue", "joint_pain", "muscle_pain", "diarrhea", "dizziness", "jaundice", "dark_urine", "weakness", "confusion", "cough", "back_pain", "pallor"], [], ["mosquito_exposure"], interview_complete=True)
        self.assertTrue(res["ready_for_testing"])
        self.assertEqual(res["testing_candidate"], "malaria")

    def test_kanren_relations_drive_candidate_selection(self):
        logic = self.evaluator.kanren.infer({"fever", "chills"}, set(), {"mosquito_exposure"})
        self.assertIn("malaria", logic["candidate_ids"])
        self.assertIn("chills", logic["evidence"]["major"]["malaria"])

    def test_resolve_negative_testing_result_switches_to_next_candidate(self):
        candidates = [
            {"disease_id": "malaria", "disease_name": "Malaria", "confidence_percentage": 85.0},
            {"disease_id": "typhoid", "disease_name": "Typhoid Fever", "confidence_percentage": 65.0}
        ]
        res = self.evaluator.resolve_testing_result(candidates, "malaria", "negative")
        self.assertEqual(res["status"], "negative")
        self.assertEqual(res["diagnoses"][0]["disease_id"], "typhoid")
        self.assertEqual(res["next_test_candidate"]["disease_id"], "typhoid")
        self.assertTrue(any(e["disease_name"] == "Malaria" for e in res["eliminated_candidates"]))

    def test_resolve_positive_testing_result_confirms_diagnosis(self):
        candidates = [
            {"disease_id": "malaria", "disease_name": "Malaria", "confidence_percentage": 85.0, "treatment_options": ["Artemether-Lumefantrine"]},
            {"disease_id": "typhoid", "disease_name": "Typhoid Fever", "confidence_percentage": 65.0}
        ]
        res = self.evaluator.resolve_testing_result(candidates, "malaria", "positive")
        self.assertEqual(res["status"], "positive")
        self.assertEqual(res["confirmed_disease"]["disease_id"], "malaria")
        self.assertIn("CONFIRMED DIAGNOSIS", res["confirmation_message"])

if __name__ == "__main__":
    unittest.main()
