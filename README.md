# DocuMend Ledger — Frontend

> **Read the bill. Understand the evidence. Make it defend itself.**

DocuMend Ledger is an AI-powered medical billing and insurance document auditing interface.

The frontend provides an interactive workflow for creating audit cases, uploading documents, running analysis, reviewing findings, understanding insurance coverage, exploring evidence, and asking questions about the uploaded case.

---

## ✨ Features

- 🧾 Medical bill auditing interface
- 📄 Multi-document case workflow
- 📤 PDF document upload
- 🔍 AI-powered analysis
- 🚨 Findings and discrepancy visualization
- 💰 Insurance coverage analysis
- 📚 Evidence/document view
- 💬 Ask DocuMend
- 🔄 Add documents to an existing case
- 🔁 Re-analyze an existing case
- 📊 Bill intelligence dashboard
- ⚡ Animated processing workflow
- 📱 Responsive interface
- 🌐 Production API integration

---

## 🏗️ Architecture

```text
┌──────────────────────────┐
│      DocuMend UI         │
│        Next.js           │
└────────────┬─────────────┘
             │
             │ HTTPS REST API
             ▼
┌──────────────────────────┐
│     FastAPI Backend      │
│         Render           │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│       Gemini API         │
└──────────────────────────┘
```

Production flow:

```text
User
 ↓
Netlify
 ↓
DocuMend Frontend
 ↓
FastAPI Backend
 ↓
Gemini
 ↓
Analysis
 ↓
Evidence-backed results
```

---

## 📁 Project Structure

```text
documend-frontend/
│
├── public/
│
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── ...
│
├── .env.local
├── package.json
├── next.config.*
├── tsconfig.json
├── README.md
└── ...
```

The exact component structure may evolve as the interface develops.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend framework |
| React | UI |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| Lucide | Icons |
| Recharts | Data visualization |
| FastAPI | Backend API |

---

## 🚀 Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/Rudra-113/documend-frontend.git
cd documend-frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the backend URL

Create:

```text
.env.local
```

Add:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

For production:

```env
NEXT_PUBLIC_API_BASE_URL=https://documend-backend.onrender.com
```

### 4. Start development server

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:3000
```

---

## 🔌 Backend Integration

The frontend communicates with the DocuMend FastAPI backend.

Production backend:

```text
https://documend-backend.onrender.com
```

### API workflow

```text
Create Case
    ↓
Upload Document
    ↓
Analyze Case
    ↓
Get Case Data
    ↓
Display Findings
    ↓
Display Insurance Analysis
    ↓
Ask DocuMend
    ↓
Add Documents
    ↓
Re-analyze
```

The frontend keeps the same `case_id` throughout the case workflow.

---

## 📡 API Endpoints Used

### Create case

```http
POST /api/cases
```

### Upload document

```http
POST /api/cases/{case_id}/documents
```

### Analyze

```http
POST /api/cases/{case_id}/analyze
```

### Case data

```http
GET /api/cases/{case_id}
```

### Findings

```http
GET /api/cases/{case_id}/findings
```

### Insurance

```http
GET /api/cases/{case_id}/insurance
```

### Ask DocuMend

```http
POST /api/cases/{case_id}/ask
```

---

## 🔄 Dynamic Case Workflow

DocuMend is designed as a real document workflow rather than a static demo.

Example:

```text
User uploads:
Hospital Bill
Insurance Policy
        ↓
      Analyze
        ↓
Findings + Insurance Analysis
        ↓
User notices missing supporting document
        ↓
Uploads additional document
        ↓
Re-analyze SAME CASE
        ↓
Updated findings and evidence
```

The application does not need predefined final results for the uploaded documents.

---

## 🧠 Intelligence Interface

The interface presents information from the backend in several sections.

### Intelligence

High-level overview of the case:

- Bill total
- Copay
- Estimated insurance share
- Estimated patient share
- Patient/facility information
- Admission/discharge information
- Bill intelligence

### Findings

Displays potential discrepancies returned by the analysis engine.

Examples:

- Arithmetic discrepancy
- Potential duplicate charge
- Quantity anomaly
- Other document inconsistencies

### Insurance

Displays the insurance analysis returned by the backend.

### Evidence

Connects findings to the documents and pages supporting them.

### Documents

Shows documents currently attached to the case.

### Ask DocuMend

Allows the user to ask questions about the current case.

Example:

```text
Why was this charge flagged?
```

or:

```text
What does the insurance policy say about MRI coverage?
```

---

## 🎨 Design Philosophy

The interface is designed as a **forensic document intelligence workspace**, rather than a generic dashboard.

Design principles include:

- Evidence-first presentation
- Minimal visual clutter
- Strong typography
- Clear information hierarchy
- Document-focused interactions
- Progressive analysis states
- Subtle motion and transitions
- Clear distinction between findings and verified facts

---

## ⚙️ Environment Variables

### Local development

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

### Production

```env
NEXT_PUBLIC_API_BASE_URL=https://documend-backend.onrender.com
```

Because `NEXT_PUBLIC_*` variables are included during the frontend build, the application must be rebuilt/redeployed after changing the production API URL.

---

## 🌐 Production Deployment

The frontend is deployed on **Netlify**.

Production site:

```text
https://radiant-torte-a02e45.netlify.app
```

Production API:

```text
https://documend-backend.onrender.com
```

### Netlify configuration

Build command:

```bash
npm run build
```

Production environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=https://documend-backend.onrender.com
```

---

## 🔐 Security

Never place the Gemini API key in the frontend.

The frontend only communicates with the backend.

The Gemini API key belongs exclusively in the backend environment:

```env
GEMINI_API_KEY=...
```

Do not commit:

```text
.env
.env.local
```

to GitHub.

---

## 🧪 Testing the Application

A basic production test should verify:

```text
☑ Landing page loads
☑ Case can be created
☑ PDF can be uploaded
☑ Document appears in case
☑ Analysis starts
☑ Analysis completes
☑ Findings are displayed
☑ Insurance analysis is displayed
☑ Documents are displayed
☑ Ask DocuMend works
☑ Additional document can be uploaded
☑ Same case can be re-analyzed
☑ Updated results are displayed
```

---

## ⚠️ Important Disclaimer

DocuMend is a document auditing and information system.

It does not:

- Make final insurance decisions
- Provide medical diagnoses
- Prescribe medication
- Guarantee insurance reimbursement
- Establish fraud solely from an anomaly

Users should verify important findings against the original documents and their insurer.

---

## 🔗 Related Repository

Backend:

```text
https://github.com/Rudra-113/documend-backend
```

Production API:

```text
https://documend-backend.onrender.com
```

Production frontend:

```text
https://radiant-torte-a02e45.netlify.app
```

---

## 👨‍💻 Project

**DocuMend Ledger**

> Don't just read the bill. Audit it.
