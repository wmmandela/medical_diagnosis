-- Seed Data for Hospital Medical Expert System

INSERT INTO users (username, email, password_hash, full_name, role)
VALUES ('dr_smith', 'drsmith@hospital.org', '$2a$10$e8T...hash', 'Dr. Sarah Smith, MD', 'PHYSICIAN'),
       ('admin', 'admin@hospital.org', '$2a$10$e8T...hash', 'System Administrator', 'ADMIN');

INSERT INTO patients (patient_code, full_name, age, gender, is_pregnant, chronic_illnesses, allergies)
VALUES ('PAT-1001', 'John Doe', 42, 'Male', FALSE, 'Hypertension', 'Penicillin'),
       ('PAT-1002', 'Jane Miller', 29, 'Female', TRUE, 'None', 'None'),
       ('PAT-1003', 'Robert Chen', 65, 'Male', FALSE, 'Diabetes Mellitus', 'NSAIDs');
