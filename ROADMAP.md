# Roadmap

This roadmap is grounded in the current codebase and focuses on the next most meaningful improvements.

## Current State

The repository already provides:

- Firebase social auth
- chat persistence
- PDF upload and asynchronous indexing
- FTS or vector retrieval
- SSE response delivery
- daily quota enforcement
- Render and Vercel deployment config

## Near-Term

### True model streaming

- Replace `generateContent` with Gemini streaming so `assistant.delta` reflects upstream token flow rather than a completed response delivered over SSE.

### Retrieval quality upgrades

- Move from single-mode retrieval to hybrid retrieval with:
  - combined vector + FTS candidate generation
  - reranking
  - diversity-aware chunk selection

### Better chunk metadata

- Preserve page references, offsets, and section metadata during PDF parsing so responses can cite where evidence came from.

### Frontend/backend limit alignment

- Decide whether the product should remain single-document-per-chat in the UI or expose the backend’s multi-document support more directly.

## Mid-Term

### Improved ingestion fidelity

- Replace plain text extraction and whitespace chunking with layout-aware parsing and smarter segmentation.

### Observability

- Add structured request IDs, worker metrics, indexing durations, and retrieval diagnostics.

### Background processing isolation

- Move the document worker into a separate process or service so ingestion throughput is not coupled to API process lifecycle.

### Signed document access

- Add explicit signed-download flows if product requirements expand beyond chat-only interaction.

## Longer-Term

### Citation-first answers

- Return grounded citations and source spans in the API contract, not just free-form assistant text.

### Evaluation harness

- Add regression datasets for:
  - retrieval relevance
  - prompt grounding
  - follow-up question handling
  - failure cases

### Multi-tenant operations

- Introduce stronger tenant-level observability, quotas, and administrative controls for production scaling.

## Maintenance Gaps Worth Closing

- add a root `LICENSE` file to match the `ISC` package metadata
- add frontend tests to GitHub Actions CI
- document cookie expectations for local HTTP development more explicitly
- unify logging so Firebase initialization also uses the structured logger
