/**
 * @scora/trust-storage — append-only evidence storage and ingestion.
 *
 * The in-memory store is the reference implementation; every adapter is held to
 * the same conformance suite. The SQLite adapter lives at
 * `@scora/trust-storage/sqlite` so that consumers who only need the in-memory
 * store (browsers, the calibration harness) never load `node:sqlite`.
 */
export { inMemoryEventStore } from "./memory.js";
export { createIngestion, } from "./ingest.js";
//# sourceMappingURL=index.js.map