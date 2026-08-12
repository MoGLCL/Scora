/**
 * `npm run calibrate`.
 *
 * Exits non-zero when a gate fails, so this can sit in CI as a blocking check.
 * That is the entire point of the package: a release that escalates an honest
 * developer should not be shippable by anyone who did not read the report.
 *
 * The report prints in full on success as well as on failure. A green run that
 * prints nothing teaches people the harness is noise; a green run that prints
 * the limitations teaches them what the pass does and does not mean.
 */
import { calibrate, renderReport } from "./run.js";
const report = calibrate();
process.stdout.write(`${renderReport(report)}\n`);
process.exitCode = report.failures.length === 0 ? 0 : 1;
//# sourceMappingURL=cli.js.map