"""
Python Kanren Expert System REST Server
Exposes HTTP endpoints for medical logic inference, adaptive question generation, and knowledge base inspection.
"""

import sys
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from rule_evaluator import RuleEvaluator
from adaptive_questioner import AdaptiveQuestioner

evaluator = RuleEvaluator()
questioner = AdaptiveQuestioner()

class RequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == "/health":
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "UP", "service": "Python Kanren Medical Inference Engine", "engine": "Clinician-Grade Kanren Logic"}).encode())
        elif parsed_path.path == "/api/v1/knowledge-base":
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "diseases_count": len(evaluator.diseases),
                "symptoms_count": len(evaluator.symptoms_dict),
                "diseases": evaluator.diseases
            }).encode())
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode())

    def do_POST(self):
        parsed_path = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_length)
        
        try:
            payload = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
        except Exception:
            payload = {}

        if parsed_path.path == "/api/v1/diagnose":
            patient_profile = payload.get("patient_profile", {})
            reported_symptoms = payload.get("reported_symptoms", [])
            denied_symptoms = payload.get("denied_symptoms", [])
            risk_factors = payload.get("risk_factors", [])
            custom_text = payload.get("custom_symptoms_text", "")
            interview_complete = payload.get("interview_complete", False)
            
            evaluation = evaluator.evaluate(patient_profile, reported_symptoms, denied_symptoms, risk_factors, custom_text, interview_complete)
            self._set_headers(200)
            self.wfile.write(json.dumps(evaluation).encode())

        elif parsed_path.path == "/api/v1/next-questions":
            reported_symptoms = payload.get("reported_symptoms", [])
            candidate_diagnoses = payload.get("candidate_diagnoses", [])
            answered_ids = payload.get("answered_symptom_ids", [])
            denied_symptoms = payload.get("denied_symptoms", [])
            
            questions = questioner.generate_next_questions(reported_symptoms, candidate_diagnoses, answered_ids, denied_symptoms)
            self._set_headers(200)
            self.wfile.write(json.dumps({"next_questions": questions}).encode())

        elif parsed_path.path == "/api/v1/testing-result":
            candidate_diagnoses = payload.get("candidate_diagnoses", [])
            tested_disease_id = payload.get("tested_disease_id")
            test_outcome = payload.get("test_outcome", "negative")
            eliminated_candidates = payload.get("eliminated_candidates", [])

            result = evaluator.resolve_testing_result(candidate_diagnoses, tested_disease_id, test_outcome, eliminated_candidates)
            self._set_headers(200)
            self.wfile.write(json.dumps(result).encode())

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode())

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, RequestHandler)
    print(f"Starting Python Kanren Expert System REST Server on port {port}...")
    httpd.serve_forever()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    run_server(port)
