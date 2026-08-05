"""Adaptive differential question selection for the clinical decision-support demo.

Questions are selected for their ability to separate the *current* candidates.  A
missing answer is unknown, never evidence that a symptom is absent.
"""

import os
from knowledge_base.rules import diseases, symptom_name, symptom_question, symptoms_dict


class AdaptiveQuestioner:
    WEIGHTS = {"mandatory": 6.0, "major": 4.0, "supporting": 1.5}

    def __init__(self, kb_dir=None):
        self.kb_dir = kb_dir or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "knowledge_base"))
        self.diseases = diseases
        self.symptoms_dict = symptoms_dict

    @staticmethod
    def _label(symptom_id):
        return symptom_id.replace("_", " ").capitalize()

    def _question(self, symptom_id):
        return symptom_question(symptom_id)

    def generate_next_questions(self, reported_symptoms, candidate_diagnoses,
                                answered_symptom_ids, denied_symptoms=None):
        """Exhaustively interrogate a fixed three-condition differential.

        The client supplies the initial top three in least-supported-first
        order. Every unresolved mandatory, major, *and supporting* symptom for
        one condition is asked before moving to the next.  This deliberately
        prevents a temporary score jump from skipping a competing condition.
        """
        answered = set(answered_symptom_ids or ()) | set(reported_symptoms or ()) | set(denied_symptoms or ())
        candidate_ids = {c.get("disease_id") for c in candidate_diagnoses or []}
        candidates = [d for d in self.diseases if d["id"] in candidate_ids]
        if not candidates:
            return []

        total_candidate_weight = sum(max(float(c.get("confidence_percentage", 1)), 1) for c in candidate_diagnoses) or 1
        # Preserve the order passed by the client: third-most likely, then
        # second, then first. Do not rerank this worklist mid-interview.
        candidate_by_id = {d["id"]: d for d in candidates}
        ordered = [candidate_by_id[c["disease_id"]] for c in candidate_diagnoses if c.get("disease_id") in candidate_by_id]
        for disease in ordered:
            unresolved = []
            for tier in ("mandatory", "major", "supporting"):
                for symptom in disease.get(tier + "_symptoms", []):
                    if symptom not in answered and symptom not in unresolved:
                        unresolved.append((tier, symptom))
            if not unresolved:
                continue
            questions = []
            for tier, symptom in unresolved:
                score = self.WEIGHTS[tier]
                names = [disease["name"]]
                questions.append({
                    "symptom_id": symptom,
                    "symptom_name": symptom_name(symptom),
                    "category": self.symptoms_dict.get(symptom, {}).get("category", "Clinical follow-up"),
                    "question": self._question(symptom),
                    "target_candidate": ", ".join(names),
                    "candidate_confidence": round(score, 1),
                    "interview_stage": "complete symptom review",
                    "relevance_reason": "Complete all unmentioned symptoms for this locked top-three candidate before proceeding."
                })
            return questions
        return []
