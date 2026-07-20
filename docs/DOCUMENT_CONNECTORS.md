# OneCare — Document Connectors

**Related:** [`ENTERPRISE_KNOWLEDGE_PLATFORM.md`](./ENTERPRISE_KNOWLEDGE_PLATFORM.md)

## Contract

`KnowledgeConnectorPort`:

- `type` / `displayName`
- `listDocuments({ tenantId, source, checkpoint?, mode })`
- optional `health()`

## Registered types (M6)

| Type | Status |
|------|--------|
| sharepoint, confluence, google_drive, onedrive, notion, wiki, hrms_api | Stub (empty list) |
| local_files, markdown, html, pdf, docx, csv | Local catalog from `source.options.documents` |

Secrets only via `source.secretRef` — never inline tokens.

## Extending

Implement `KnowledgeConnectorPort`, `registry.register(connector)`. Zero changes to ingestion or retrieval.
