"""Canonical Kanren knowledge base aggregator."""

from knowledge_base.knowledge import diseases, recommendations, tests, contraindications, triage_rules
from knowledge_base.questions import aliases_dict, resolve_custom_symptoms, symptom_name, symptom_question, symptoms_dict
from knowledge_base.facts import conditions_with, KanrenClinicalInference

__all__ = [
    'diseases', 'recommendations', 'tests', 'contraindications', 'triage_rules',
    'symptoms_dict', 'aliases_dict', 'resolve_custom_symptoms', 'symptom_name', 'symptom_question',
    'conditions_with', 'KanrenClinicalInference'
]
