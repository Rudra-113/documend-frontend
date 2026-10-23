const files: Array<[string, string, string]> = [
  [
    "Meridian-City-Hospital-final-bill.pdf",
    "application/pdf",
    "Final inpatient bill. Ananya Krishnan. Laparoscopic cholecystectomy. Meridian City Hospital, Bengaluru.",
  ],
  [
    "Northstar-Health-Assure-policy-schedule.pdf",
    "application/pdf",
    "Policy schedule NH-88421-K. Northstar Health Assure Gold. Room cap and proportionate deduction.",
  ],
  [
    "Discharge-summary-Krishnan.pdf",
    "application/pdf",
    "Discharge summary. Discharged 16 Oct 2026 at 11:40. No drain. Ultrasound only.",
  ],
  [
    "Discharge-prescription.pdf",
    "application/pdf",
    "Tab. Cefuroxime 500 mg twice daily for five days. Stop IV antibiotics at discharge.",
  ],
  [
    "USG-and-LFT-report.pdf",
    "application/pdf",
    "Ultrasound abdomen and liver function. No MRCP in this study.",
  ],
  [
    "Pharmacy-receipt-16-Oct.pdf",
    "application/pdf",
    "Cash receipt for discharge medicines, collected from the patient.",
  ],
  [
    "Pre-auth-approval-NH88421.pdf",
    "application/pdf",
    "Pre-authorization NH-PA-22918. Three nights, semi-private, laparoscopic cholecystectomy.",
  ],
];

export function meridianSampleFiles() {
  return files.map(([name, type, text]) => new File([text], name, { type }));
}

export const MERIDIAN_SAMPLE_NOTE =
  "A four-night laparoscopic cholecystectomy. The bill, the policy, and the discharge summary do not agree.";
