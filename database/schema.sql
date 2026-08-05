-- Hospital Medical Expert System Database Schema

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'PHYSICIAN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    is_pregnant BOOLEAN DEFAULT FALSE,
    chronic_illnesses TEXT,
    allergies TEXT,
    contact_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consultations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    physician_id BIGINT NOT NULL,
    consultation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    primary_symptoms TEXT NOT NULL,
    fever_degree DOUBLE,
    pain_level INT,
    overall_urgency VARCHAR(30) NOT NULL,
    top_diagnosis VARCHAR(150) NOT NULL,
    confidence_percentage DOUBLE NOT NULL,
    reasoning_trace TEXT NOT NULL,
    recommended_tests TEXT,
    first_aid_advice TEXT,
    treatment_options TEXT,
    specialist_referral VARCHAR(150),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (physician_id) REFERENCES users(id)
);
