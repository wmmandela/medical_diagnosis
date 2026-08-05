package com.hospital.expertsystem.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "patients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patient {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String patientCode;

    @Column(nullable = false)
    private String fullName;

    private Integer age;

    private String gender;

    private Boolean isPregnant = false;

    private String chronicIllnesses;

    private String allergies;

    private String contactNumber;

    private LocalDateTime createdAt = LocalDateTime.now();
}
