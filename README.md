# DocuMend Ledger

Forensic review for medical bills. Upload a hospital bill with the policy, discharge summary, prescription, diagnostic report, and receipts. The ledger looks for duplicate charges, quantity anomalies, cross-document contradictions, missing records, and the lines insurance will not pay.

The interface talks only to `lib/api/client.ts`. With no server configured, that client uses a reference extractor in the browser. Set `NEXT_PUBLIC_API_BASE_URL` and the case workflow calls FastAPI. The landing exhibit stays a visual specimen.

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

Restart the dev server. The browser calls same-origin `/api/*`. Next proxies those requests to `NEXT_PUBLIC_API_BASE_URL`, so the page does not depend on FastAPI CORS.

| Method | Path | Body |
| --- | --- | --- |
| `POST` | `/api/cases` | empty. Returns `{ "case_id" }` |
| `POST` | `/api/cases/{case_id}/documents` | multipart field `file` |
| `POST` | `/api/cases/{case_id}/analyze` | empty. Returns the finished case |
| `GET` | `/api/cases/{case_id}` | documents, findings, insurance, `analysis_status` |
| `GET` | `/api/cases/{case_id}/findings` | finding list |
| `GET` | `/api/cases/{case_id}/insurance` | `estimated`, `insufficient_documents`, or `needs_review` |
| `POST` | `/api/cases/{case_id}/ask` | `{ "question": string }` |

Open a case, upload, and re-analyze all use that same `case_id`. The processing screen stays on the earlier stages until analyze responds. Case ids opened in this browser are restored with `GET /api/cases/{case_id}`.

The named client is `lib/api/fastapi.ts`: `createCase`, `uploadDocument`, `analyzeCase`, `getCase`, `getFindings`, `getInsurance`, `askDocuMend`. Screens call `lib/api/client.ts` rather than `fetch`.

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
