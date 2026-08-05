"""Kanren facts, relations, and inference logic."""

from knowledge_base.kanren_runtime import *

mandatory_symptom = Relation("mandatory_symptom")
major_symptom = Relation("major_symptom")
supporting_symptom = Relation("supporting_symptom")
disease_risk = Relation("disease_risk")
severity_trigger = Relation("severity_trigger")
recommended_test = Relation("recommended_test")

# Explicit Kanren facts for mandatory, major, and supporting symptom relations.
facts(mandatory_symptom,
    ("malaria", "fever"), ("typhoid", "fever"), ("pneumonia", "cough"),
    ("tuberculosis", "cough"), ("influenza", "fever"), ("dengue", "fever"),
    ("cholera", "diarrhea"), ("meningitis", "headache"), ("asthma", "shortness_of_breath"),
    ("anemia", "fatigue"), ("liver_disease", "jaundice"), ("peptic_ulcer", "abdominal_pain"),
    ("appendicitis", "abdominal_pain"), ("urinary_tract_infection", "dysuria"),
    ("migraine", "headache"), ("arthritis", "joint_pain"))

facts(major_symptom,
    ("malaria", "chills"), ("malaria", "sweating"), ("malaria", "headache"),
    ("typhoid", "abdominal_pain"), ("typhoid", "headache"), ("typhoid", "weakness"),
    ("pneumonia", "shortness_of_breath"), ("pneumonia", "fever"), ("pneumonia", "chest_pain"),
    ("tuberculosis", "hemoptysis"), ("tuberculosis", "night_sweats"), ("tuberculosis", "unexplained_weight_loss"),
    ("covid19", "fever"), ("covid19", "cough"), ("covid19", "loss_of_taste_smell"),
    ("influenza", "cough"), ("influenza", "headache"), ("influenza", "chills"),
    ("dengue", "retro_orbital_pain"), ("dengue", "joint_pain"), ("dengue", "skin_rash"),
    ("cholera", "nausea_vomiting"), ("cholera", "dehydration"),
    ("meningitis", "fever"), ("meningitis", "nuchal_rigidity"), ("meningitis", "altered_mental_status"),
    ("asthma", "wheezing"), ("asthma", "cough"), ("asthma", "chest_pain"),
    ("diabetes_mellitus", "polyuria_polydipsia"), ("diabetes_mellitus", "unexplained_weight_loss"),
    ("hypertension", "headache"), ("hypertension", "dizziness"), ("anemia", "pallor"), ("anemia", "dizziness"),
    ("kidney_disease", "fatigue"), ("kidney_disease", "nausea_vomiting"), ("kidney_disease", "flank_pain"),
    ("liver_disease", "abdominal_pain"), ("liver_disease", "fatigue"), ("peptic_ulcer", "nausea_vomiting"),
    ("appendicitis", "nausea_vomiting"), ("appendicitis", "fever"),
    ("urinary_tract_infection", "urinary_frequency"), ("urinary_tract_infection", "abdominal_pain"),
    ("allergies", "skin_rash"), ("allergies", "urticaria_hives"),
    ("migraine", "nausea_vomiting"), ("migraine", "photophobia"),
    ("arthritis", "joint_stiffness"), ("arthritis", "joint_swelling"),
    ("food_poisoning", "nausea_vomiting"), ("food_poisoning", "diarrhea"), ("food_poisoning", "abdominal_pain"),
    ("dehydration", "fatigue"), ("dehydration", "dizziness"), ("dehydration", "dry_mouth_mucosa"))


_SUPPORTING = {
 "malaria":"nausea_vomiting fatigue joint_pain muscle_pain diarrhea dizziness jaundice dark_urine weakness confusion cough back_pain pallor",
 "typhoid":"diarrhea loss_of_appetite dry_cough constipation skin_rash chills nausea_vomiting",
 "pneumonia":"chills fatigue purulent_sputum nausea_vomiting diarrhea altered_mental_status",
 "tuberculosis":"fever fatigue chest_pain loss_of_appetite chills shortness_of_breath purulent_sputum",
 "covid19":"shortness_of_breath fatigue headache sore_throat chills nasal_congestion joint_pain nausea_vomiting diarrhea",
 "influenza":"joint_pain fatigue nasal_congestion sore_throat nausea_vomiting diarrhea weakness",
 "dengue":"headache nausea_vomiting fatigue weakness swollen_glands muscle_pain bone_pain loss_of_appetite petechiae easy_bruising nose_bleeding gum_bleeding blood_in_urine facial_flushing",
 "cholera":"muscle_cramps fatigue dry_mouth_mucosa oliguria_anuria thirst dizziness",
 "meningitis":"photophobia nausea_vomiting skin_rash seizures cold_hands_feet diarrhea",
 "asthma":"anxiety fatigue nasal_congestion sore_throat", "diabetes_mellitus":"fatigue blurred_vision slow_wound_healing recurrent_thrush genital_itching",
 "hypertension":"chest_pain blurred_vision", "anemia":"shortness_of_breath palpitations headache cold_hands_feet",
 "kidney_disease":"peripheral_edema oliguria_anuria dark_urine shortness_of_breath itching confusion",
 "liver_disease":"nausea_vomiting dark_urine loss_of_appetite itching pale_stools joint_pain", "peptic_ulcer":"bloating loss_of_appetite",
 "appendicitis":"loss_of_appetite abdominal_swelling constipation diarrhea inability_to_pass_gas",
 "urinary_tract_infection":"fever cloudy_urine blood_in_urine flank_pain nausea_vomiting",
 "allergies":"shortness_of_breath nasal_congestion itching facial_swelling wheezing", "migraine":"dizziness sensitivity_to_sound visual_aura",
 "arthritis":"fatigue joint_redness reduced_joint_movement", "food_poisoning":"fever headache loss_of_appetite muscle_cramps dehydration",
 "dehydration":"nausea_vomiting diarrhea thirst dark_urine oliguria_anuria weakness"}

facts(supporting_symptom, *((disease, symptom) for disease, values in _SUPPORTING.items() for symptom in values.split()))


_RISKS = {
"malaria":"mosquito_exposure endemic_travel", "typhoid":"contaminated_water street_food_exposure", "pneumonia":"smoking chronic_lung_disease recent_uri", "tuberculosis":"close_contact_tb immunocompromised", "covid19":"recent_exposure unvaccinated",
"influenza":"seasonal_epidemic", "dengue":"mosquito_exposure tropical_travel", "cholera":"contaminated_water", "meningitis":"recent_ear_sinus_infection", "asthma":"allergens_exposure family_history_atopy",
"diabetes_mellitus":"family_history_diabetes obesity", "hypertension":"high_sodium_diet family_history", "anemia":"heavy_menstrual_bleeding poor_iron_intake",
"kidney_disease":"longstanding_diabetes hypertension", "liver_disease":"viral_hepatitis_exposure alcohol_abuse", "peptic_ulcer":"h_pylori_infection chronic_nsaid_use",
"appendicitis":"age_10_to_30", "urinary_tract_infection":"female_sex sexual_activity", "allergies":"known_food_drug_allergy", "migraine":"family_history stress",
"arthritis":"aging joint_trauma", "food_poisoning":"ingestion_spoiled_food", "dehydration":"profuse_vomiting_diarrhea heat_exposure"}

facts(disease_risk, *((disease, factor) for disease, values in _RISKS.items() for factor in values.split()))

facts(severity_trigger,
    ("malaria", "confusion"), ("malaria", "seizures"), ("malaria", "coma"), ("malaria", "severe_anemia"), ("malaria", "acute_kidney_injury"), ("malaria", "difficulty_breathing"), ("malaria", "abnormal_bleeding"),
    ("dengue", "severe_abdominal_pain"), ("dengue", "persistent_vomiting"), ("dengue", "mucosal_bleeding"), ("dengue", "fluid_accumulation"), ("dengue", "lethargy"),
    ("dengue", "restlessness"), ("dengue", "cold_clammy_skin"), ("dengue", "difficulty_breathing"))


def conditions_with(symptom):
    disease = var()
    return run(0, disease, conde((mandatory_symptom(disease, symptom),), (major_symptom(disease, symptom),), (supporting_symptom(disease, symptom),)))


class KanrenClinicalInference:
    """All candidate, evidence, and symptom lookups are Kanren queries."""
    RELATIONS = {"mandatory": mandatory_symptom, "major": major_symptom, "supporting": supporting_symptom}

    @staticmethod
    def _conditions_for(relation, value):
        condition = var("condition")
        return set(run(0, condition, relation(condition, value)))

    def infer(self, reported_symptoms, denied_symptoms, risk_factors):
        evidence = {tier: {} for tier in self.RELATIONS}
        denied = {tier: {} for tier in self.RELATIONS}
        candidates, risks = set(), {}
        for tier, relation in self.RELATIONS.items():
            for symptom in reported_symptoms:
                for condition in self._conditions_for(relation, symptom):
                    candidates.add(condition); evidence[tier].setdefault(condition, set()).add(symptom)
            for symptom in denied_symptoms:
                for condition in self._conditions_for(relation, symptom):
                    denied[tier].setdefault(condition, set()).add(symptom)
        for factor in risk_factors:
            for condition in self._conditions_for(disease_risk, factor):
                candidates.add(condition); risks.setdefault(condition, set()).add(factor)
        return {"candidate_ids": candidates, "evidence": evidence, "denied": denied, "risks": risks}

    def symptoms_for(self, condition, tier):
        symptom = var("symptom")
        return set(run(0, symptom, self.RELATIONS[tier](condition, symptom)))

