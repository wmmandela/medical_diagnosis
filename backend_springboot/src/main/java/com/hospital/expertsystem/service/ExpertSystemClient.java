package com.hospital.expertsystem.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.util.Map;

@Service
public class ExpertSystemClient {

    @Value("${expert-system.python-url:http://localhost:8000}")
    private String pythonEngineUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> evaluateDiagnosis(Map<String, Object> requestPayload) {
        String url = pythonEngineUrl + "/api/v1/diagnose";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestPayload, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return Map.of("error", "Failed to connect to Python Kanren Expert System: " + e.getMessage());
        }
    }

    public Map<String, Object> getNextQuestions(Map<String, Object> requestPayload) {
        String url = pythonEngineUrl + "/api/v1/next-questions";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestPayload, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return Map.of("error", "Failed to retrieve next questions: " + e.getMessage());
        }
    }
}
