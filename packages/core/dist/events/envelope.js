/** Which component asserted the event. Producers are not equally trustworthy. */
export const EventSource = {
    /** The instrumented sandbox runtime. Client-side, therefore untrusted. */
    SANDBOX: 'SANDBOX',
    /** An opt-in external-activity agent. Client-side, therefore untrusted. */
    BROWSER_AGENT: 'BROWSER_AGENT',
    /** The platform's own backend. Trusted. */
    SERVER: 'SERVER',
    /** An AI service acting as examiner or analyst. Trusted, but its content is an opinion. */
    AI_SERVICE: 'AI_SERVICE',
    /** A human reviewer or administrator. Trusted and authoritative. */
    HUMAN: 'HUMAN',
    /** The calibration harness replaying synthetic sessions. Never mixed with real tenants. */
    CALIBRATION_HARNESS: 'CALIBRATION_HARNESS',
};
/** Producers whose claims must be corroborated before they can affect Risk. */
export const UNTRUSTED_SOURCES = [
    EventSource.SANDBOX,
    EventSource.BROWSER_AGENT,
];
export function isUntrustedSource(source) {
    return UNTRUSTED_SOURCES.includes(source);
}
/**
 * Envelope schema version, stored on every event.
 *
 * The evidence log is append-only and must stay readable for as long as
 * retention requires, so stored events are never rewritten to a new shape;
 * readers upgrade on the way out instead.
 */
export const EVENT_SCHEMA_VERSION = 1;
export function isTrustEvent(value) {
    return 'integrity' in value && 'receivedAt' in value;
}
//# sourceMappingURL=envelope.js.map