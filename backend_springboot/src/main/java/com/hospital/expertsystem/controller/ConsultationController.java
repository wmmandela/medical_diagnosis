package com.hospital.expertsystem.controller;

import com.hospital.expertsystem.service.ExpertSystemClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/consultations")
@CrossOrigin(origins = "*")
public class ConsultationController {

    @Autowired
    private ExpertSystemClient expertSystemClient;

    @PostMapping("/diagnose")
    public ResponseEntity<?> diagnosePatient(@RequestBody Map<String, Object> requestPayload) {
        Map<String, Object> result = expertSystemClient.evaluateDiagnosis(requestPayload);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/next-questions")
    public ResponseEntity<?> getNextQuestions(@RequestBody Map<String, Object> requestPayload) {
        Map<String, Object> result = expertSystemClient.getNextQuestions(requestPayload);
        return ResponseEntity.ok(result);
    }
}
