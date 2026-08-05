package com.hospital.expertsystem.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "consultations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Consultation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long patientId;
    private Long physicianId;

    private LocalDateTime consultationDate = LocalDateTime.now();

    @Column(columnDefinition = "TEXT")
    private String primarySymptoms;

    private Double feverDegree;
    private Integer painLevel;

    private String overallUrgency;
    private String topDiagnosis;
    private Double confidencePercentage;

    @Column(columnDefinition = "TEXT")
    private String reasoningTrace;

    @Column(columnDefinition = "TEXT")
    private String recommendedTests;

    @Column(columnDefinition = "TEXT")
    private String firstAidAdvice;

    @Column(columnDefinition = "TEXT")
    private String treatmentOptions;

    private String specialistReferral;
}
