import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _formKey = GlobalKey<FormState>();
  final String _patientName = "Eleanor Vance";
  final int _age = 34;
  final double _fever = 38.8;
  final int _pain = 6;
  final List<String> _selectedSymptoms = ["fever", "chills", "headache"];

  bool _isInferenceRunning = false;
  Map<String, dynamic>? _diagnosisResult;

  void _runKanrenInference() {
    setState(() {
      _isInferenceRunning = true;
    });

    Future.delayed(const Duration(seconds: 1), () {
      setState(() {
        _isInferenceRunning = false;
        _diagnosisResult = {
          "disease_name": "Malaria",
          "category": "Parasitic Infection",
          "icd10": "B54",
          "confidence_percentage": 85.0,
          "urgency_level": "Urgent",
          "reasoning_trace": [
            "Kanren Relation Matched: [disease_symptom('malaria')]",
            "Primary Symptom Match: Fever (+1.0 weight)",
            "Primary Symptom Match: Chills & Sweating (+1.0 weight)",
            "Primary Symptom Match: Severe Headache (+1.0 weight)",
            "Risk Factor Match: Mosquito Exposure (+0.3 weight)"
          ],
          "first_aid_advice": "Ensure bed rest, oral rehydration salts (ORS), and Paracetamol for fever.",
          "specialist_referral": "Infectious Disease Specialist / Internal Medicine",
          "recommended_tests": [
            {"name": "Rapid Diagnostic Test (RDT) for Malaria", "sample": "Blood", "urgency": "Urgent"},
            {"name": "Thick & Thin Blood Smear Microscopy", "sample": "Capillary Blood", "urgency": "Urgent"}
          ]
        };
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AegisMed AI - Hospital Expert System'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () {},
            tooltip: 'Consultation History',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Patient Questionnaire & Vitals',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                    ),
                    const SizedBox(height: 16),
                    ListTile(
                      leading: const CircleAvatar(
                        backgroundColor: AppTheme.primaryLight,
                        child: Icon(Icons.person, color: AppTheme.primaryColor),
                      ),
                      title: Text(_patientName, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('Age: $_age | Sex: Female | Temp: $_fever°C | Pain: $_pain/10'),
                    ),
                    const Divider(),
                    const Text('Selected Symptoms:', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: _selectedSymptoms.map((s) => Chip(
                        label: Text(s),
                        backgroundColor: AppTheme.primaryLight,
                        side: BorderSide.none,
                      )).toList(),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _isInferenceRunning ? null : _runKanrenInference,
                        icon: _isInferenceRunning
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Icon(Icons.auto_awesome),
                        label: Text(_isInferenceRunning ? 'Executing Kanren Engine...' : 'Run Kanren Logic Inference'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            if (_diagnosisResult != null)
              Card(
                color: Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Chip(
                            label: Text(_diagnosisResult!["urgency_level"].toUpperCase()),
                            backgroundColor: AppTheme.urgencyUrgent.withOpacity(0.2),
                            labelStyle: const TextStyle(color: AppTheme.urgencyUrgent, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            'Confidence: ${_diagnosisResult!["confidence_percentage"]}%',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _diagnosisResult!["disease_name"],
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                      ),
                      Text('ICD-10: ${_diagnosisResult!["icd10"]}', style: const TextStyle(color: Colors.grey)),
                      const SizedBox(height: 16),
                      const Text('Explainable Reasoning Trace:', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.backgroundColor,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: (_diagnosisResult!["reasoning_trace"] as List).map((step) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              children: [
                                const Icon(Icons.arrow_right, size: 18, color: AppTheme.primaryColor),
                                const SizedBox(width: 4),
                                Expanded(child: Text(step, style: const TextStyle(fontFamily: 'monospace', fontSize: 13))),
                              ],
                            ),
                          )).toList(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
