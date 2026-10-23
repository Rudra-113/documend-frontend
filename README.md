# DocuMend Ledger

Forensic review for medical bills. Upload a hospital bill with the policy, discharge summary, prescription, diagnostic report, and receipts. The ledger looks for duplicate charges, quantity anomalies, cross-document contradictions, missing records, and the lines insurance will not pay.

The interface talks only to `lib/api/client.ts`. With no server configured, that client uses a reference extractor in the browser. Set `NEXT_PUBLIC_API_BASE_URL` and the same calls go to FastAPI.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Choose **Meridian sample** for a four-night laparoscopic cholecystectomy whose bill, policy, and discharge summary do not agree. Or drop your own PDFs and images and set each document type before analysis. The mock extractor keys off document type, not the bytes inside the file.

After an audit you can add more documents and re-analyze. The score and findings are rebuilt from whatever is on the case.

Check the money identity and a few rules without the UI:

```bash
npx tsx scripts/check-ledger.ts
```

## Connect FastAPI

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Restart the dev server. Every screen keeps calling the client below. Allow the Next.js origin in FastAPI CORS.

| Method | Path | Body |
| --- | --- | --- |
| `GET` | `/api/cases` | Case summaries |
| `POST` | `/api/cases` | `{ "title"?: string }` |
| `POST` | `/api/cases/{caseId}/documents` | multipart `files` plus `types` (one per file, empty string if unknown) |
| `PATCH` | `/api/cases/{caseId}/documents/{documentId}` | `{ "type": DocumentType }` |
| `DELETE` | `/api/cases/{caseId}/documents/{documentId}` | |
| `POST` | `/api/cases/{caseId}/analyze` | starts the pipeline |
| `GET` | `/api/cases/{caseId}/status` | phase, documents, pipeline, messages |
| `GET` | `/api/cases/{caseId}/results` | face sheet, ledger, score |
| `GET` | `/api/cases/{caseId}/findings` | finding list |
| `GET` | `/api/cases/{caseId}/insurance` | coverage rows and denial explanations |
| `GET` | `/api/findings/{findingId}/evidence` | excerpts for one finding |
| `POST` | `/api/cases/{caseId}/ask` | `{ "question": string }` |

Shapes live in `lib/types/domain.ts`. Status while `phase` is `"processing"` must keep moving: `pipeline.stages`, `pipeline.events`, and `pipeline.progress` drive the analysis screen. The UI polls status about twice a second and only then requests results, findings, and insurance.

Return `409` with `{ "message": "...", "code": "analysis_in_progress" }` if documents change during a run, and the same shape with `code: "not_ready"` if results are requested early. Errors may also use FastAPI's `detail` string.

Document types: `hospital_bill`, `insurance_policy`, `discharge_summary`, `prescription`, `diagnostic_report`, `receipt`, `pre_authorization`, `operative_notes`, `other`.

## Layout

```
app/                  routes
components/           layout, upload, analysis, dashboard, findings,
                      evidence, insurance, chat, documents, reports
lib/api               client, live HTTP adapter
lib/mock              reference extractor and pipeline clock
lib/types             shared contract
```

UI components call the hook in `lib/hooks/use-case.ts`. They do not fetch on their own and they do not embed audit figures.
