import { DeveloperId, SessionId, verifyChain, } from '@scora/trust-core';
import { extractFeatures } from '@scora/trust-features';
import { developerFacingSummary, renderReport, score } from '@scora/trust-scoring';
import { PrincipalKind, Role, } from "./contract.js";
import { assertPolicyInvariants, defaultPolicy, permittedScopes, } from "./policy.js";
export function buildRoutes(dependencies) {
    const { store, ingestion, policies, clock, crypto } = dependencies;
    return [
        {
            method: 'POST',
            pattern: '/v1/sessions/:sessionId/events',
            roles: [Role.INGEST],
            summary: 'Submit a batch of telemetry events for one session.',
            async handler(request, principal) {
                const matched = request;
                const sessionId = SessionId.unsafe(matched.params['sessionId'] ?? '');
                // A sandbox credential is issued per session. Enforced here rather than
                // trusted from the body: a leaked token must not be usable to forge
                // evidence into an unrelated assessment.
                if (principal.kind === PrincipalKind.SANDBOX && principal.sessionId !== sessionId) {
                    return problem(403, 'Forbidden', 'this credential is scoped to a different session');
                }
                const body = matched.body;
                if (!isRecord(body) || !Array.isArray(body['events'])) {
                    return problem(400, 'Bad Request', 'body must be { events: [...] }');
                }
                const events = body['events'].map((event) => isRecord(event) ? { ...event, tenantId: principal.tenantId, sessionId } : event);
                const offset = typeof body['clockOffsetMs'] === 'number' ? body['clockOffsetMs'] : undefined;
                const result = await ingestion.ingest(events, offset === undefined ? {} : { clockOffsetMs: offset });
                // 202, not 201. Some events in a batch may have been rejected or
                // withheld, and the response says exactly which — a flat 201 would
                // report a partially-stored batch as fully accepted.
                return {
                    status: 202,
                    body: {
                        accepted: result.accepted,
                        duplicates: result.duplicates,
                        rejected: result.rejected.map((rejection) => ({
                            eventId: rejection.eventId,
                            code: rejection.code,
                            issues: rejection.issues,
                        })),
                        withheld: result.withheld,
                        gaps: result.gaps,
                        chainPosition: result.head?.chainPosition ?? null,
                    },
                };
            },
        },
        {
            method: 'GET',
            pattern: '/v1/sessions/:sessionId/report',
            roles: [Role.READ_REPORT],
            summary: 'Full reviewer report: Trust, Risk, Confidence, clusters, explanation.',
            async handler(request, principal) {
                const matched = request;
                const sessionId = SessionId.unsafe(matched.params['sessionId'] ?? '');
                const events = await store.readSession(principal.tenantId, sessionId);
                if (events.length === 0)
                    return notFoundSession();
                const first = events[0];
                const extraction = extractFeatures(events, {
                    tenantId: principal.tenantId,
                    sessionId,
                    developerId: first.developerId,
                    taskId: first.taskId,
                });
                const result = score(extraction);
                const verification = verifyChain(events, crypto.sha256);
                return {
                    status: 200,
                    body: {
                        sessionId,
                        developerId: first.developerId,
                        trust: result.trust,
                        risk: result.risk,
                        confidence: result.confidence,
                        recommendation: result.recommendation,
                        rationale: result.rationale,
                        explanation: result.explanation,
                        layers: result.layers.map((layer) => ({
                            layer: layer.layer,
                            standing: layer.standing,
                            coverage: layer.coverage,
                            confidence: layer.confidence,
                            summary: layer.summary,
                        })),
                        clusters: result.clusters
                            .filter((finding) => finding.fired)
                            .map((finding) => ({
                            id: finding.definition.id,
                            title: finding.definition.title,
                            severity: finding.severity,
                            confidence: finding.confidence,
                            conditionsMet: finding.conditionsMet,
                            conditionsTotal: finding.conditionsTotal,
                            layersCorroborating: finding.layersCorroborating,
                            interpretation: finding.definition.interpretation,
                        })),
                        limitations: result.limitations,
                        // Surfaced with the report rather than behind a separate call: a
                        // reviewer must never read a score without knowing whether the
                        // evidence under it is intact.
                        evidenceIntegrity: {
                            intact: verification.intact,
                            eventsChecked: verification.eventsChecked,
                            violations: verification.violations,
                            missingSequences: verification.missingSequences,
                        },
                        policyVersion: result.policyVersion,
                    },
                };
            },
        },
        {
            method: 'GET',
            pattern: '/v1/sessions/:sessionId/report.txt',
            roles: [Role.READ_REPORT],
            summary: 'The same report, rendered for a human reviewer.',
            async handler(request, principal) {
                const matched = request;
                const sessionId = SessionId.unsafe(matched.params['sessionId'] ?? '');
                const events = await store.readSession(principal.tenantId, sessionId);
                if (events.length === 0)
                    return notFoundSession();
                const first = events[0];
                const extraction = extractFeatures(events, {
                    tenantId: principal.tenantId,
                    sessionId,
                    developerId: first.developerId,
                    taskId: first.taskId,
                });
                return {
                    status: 200,
                    body: renderReport(score(extraction)),
                    headers: { 'content-type': 'text/plain; charset=utf-8' },
                };
            },
        },
        {
            method: 'GET',
            pattern: '/v1/sessions/:sessionId/events',
            roles: [Role.READ_EVIDENCE],
            summary: 'Raw event log for a session, paginated by chain position.',
            async handler(request, principal) {
                const matched = request;
                const sessionId = SessionId.unsafe(matched.params['sessionId'] ?? '');
                const limit = parsePositiveInt(matched.query['limit']) ?? 200;
                const cursor = matched.query['cursor'] ?? null;
                const page = await store.read({
                    tenantId: principal.tenantId,
                    sessionId,
                    limit,
                    cursor,
                });
                if (page.events.length === 0 && cursor === null)
                    return notFoundSession();
                return {
                    status: 200,
                    body: { events: page.events, nextCursor: page.nextCursor },
                };
            },
        },
        {
            method: 'GET',
            pattern: '/v1/sessions/:sessionId/integrity',
            roles: [Role.READ_EVIDENCE],
            summary: 'Verify the hash chain for a session.',
            async handler(request, principal) {
                const matched = request;
                const sessionId = SessionId.unsafe(matched.params['sessionId'] ?? '');
                const events = await store.readSession(principal.tenantId, sessionId);
                if (events.length === 0)
                    return notFoundSession();
                const verification = verifyChain(events, crypto.sha256);
                return {
                    status: 200,
                    body: {
                        sessionId,
                        intact: verification.intact,
                        eventsChecked: verification.eventsChecked,
                        headHash: verification.headHash,
                        violations: verification.violations,
                        // Lost telemetry. Reported next to the violations but categorically
                        // different from them: this lowers Confidence, it is not tampering.
                        missingSequences: verification.missingSequences,
                    },
                };
            },
        },
        {
            method: 'GET',
            pattern: '/v1/developers/:developerId/sessions',
            roles: [Role.READ_REPORT],
            summary: 'Sessions for one developer, newest first.',
            async handler(request, principal) {
                const matched = request;
                const developerId = DeveloperId.unsafe(matched.params['developerId'] ?? '');
                const sessions = await store.listSessions(principal.tenantId, developerId, {
                    limit: parsePositiveInt(matched.query['limit']) ?? 50,
                });
                return { status: 200, body: { sessions } };
            },
        },
        {
            method: 'GET',
            pattern: '/v1/me/outcome/:sessionId',
            roles: [Role.READ_OWN_OUTCOME],
            summary: 'The one-sentence outcome a developer is entitled to see.',
            async handler(request, principal) {
                const matched = request;
                const sessionId = SessionId.unsafe(matched.params['sessionId'] ?? '');
                const events = await store.readSession(principal.tenantId, sessionId);
                if (events.length === 0)
                    return notFoundSession();
                const first = events[0];
                // A developer token reads its own sessions and nothing else. Same 404 as
                // a session that does not exist, so this cannot be used to discover
                // whether another developer sat this assessment.
                if (principal.developerId !== undefined && principal.developerId !== first.developerId) {
                    return notFoundSession();
                }
                const policy = await loadPolicy(principal.tenantId);
                if (!policy.review.developerVisibleOutcome) {
                    return problem(403, 'Forbidden', 'this tenant has not enabled developer-visible outcomes');
                }
                const extraction = extractFeatures(events, {
                    tenantId: principal.tenantId,
                    sessionId,
                    developerId: first.developerId,
                    taskId: first.taskId,
                });
                const result = score(extraction);
                // Deliberately not the full report. A developer is not shown cluster
                // names or a risk number by an automated system before a human has
                // looked at the session.
                return {
                    status: 200,
                    body: {
                        sessionId,
                        summary: developerFacingSummary(result),
                        recommendation: result.recommendation,
                        confidence: result.confidence,
                    },
                };
            },
        },
        {
            method: 'GET',
            pattern: '/v1/policy',
            roles: [Role.ADMINISTER],
            summary: 'Read this tenant policy.',
            async handler(_request, principal) {
                return { status: 200, body: redactPolicy(await loadPolicy(principal.tenantId)) };
            },
        },
        {
            method: 'PUT',
            pattern: '/v1/policy',
            roles: [Role.ADMINISTER],
            summary: 'Replace this tenant policy. Rejected if it weakens a platform guarantee.',
            async handler(request, principal) {
                const matched = request;
                if (!isRecord(matched.body))
                    return problem(400, 'Bad Request', 'body must be an object');
                const current = await loadPolicy(principal.tenantId);
                const proposed = {
                    ...current,
                    ...matched.body,
                    // Never taken from the body. A policy write must not be able to
                    // retarget itself at another tenant.
                    tenantId: principal.tenantId,
                    updatedAt: clock.now(),
                    updatedBy: principal.subject,
                };
                const violations = assertPolicyInvariants(proposed);
                if (violations.length > 0) {
                    return {
                        status: 422,
                        body: {
                            type: 'about:blank',
                            title: 'Unprocessable Entity',
                            status: 422,
                            detail: 'the proposed policy would weaken a guarantee the platform makes to developers',
                            errors: violations.map((violation) => ({
                                path: violation.path,
                                message: violation.message,
                            })),
                        },
                    };
                }
                await policies.save(proposed);
                return { status: 200, body: redactPolicy(proposed) };
            },
        },
        {
            method: 'GET',
            pattern: '/v1/policy/scopes',
            roles: [Role.ADMINISTER],
            summary: 'Consent scopes this policy permits collection under.',
            async handler(_request, principal) {
                const policy = await loadPolicy(principal.tenantId);
                return { status: 200, body: { scopes: permittedScopes(policy) } };
            },
        },
    ];
    async function loadPolicy(tenantId) {
        const stored = await policies.load(tenantId);
        // A tenant with no policy gets the least-collecting one, not an
        // unconfigured engine. There is no state in which collection is
        // unrestricted because nobody has set a policy yet.
        return stored ?? defaultPolicy(tenantId, clock.now(), 'system');
    }
}
/**
 * Strips anything that should not leave the server.
 *
 * `apiKeyRef` names a secret rather than containing one, so it is safe — but
 * echoing the whole provider block back is how a future field that *does* carry
 * a secret ends up on an admin's screen and in their browser history. The
 * allowlist is the point.
 */
function redactPolicy(policy) {
    return {
        tenantId: policy.tenantId,
        updatedAt: policy.updatedAt,
        updatedBy: policy.updatedBy,
        assistance: {
            completionsEnabled: policy.assistance.completionsEnabled,
            provider: {
                kind: policy.assistance.provider.kind,
                model: policy.assistance.provider.model,
                apiKeyRef: policy.assistance.provider.apiKeyRef,
                endpoint: policy.assistance.provider.endpoint,
                timeoutMs: policy.assistance.provider.timeoutMs,
            },
            maxCompletionChars: policy.assistance.maxCompletionChars,
            maxCompletionsPerMinute: policy.assistance.maxCompletionsPerMinute,
            languages: policy.assistance.languages,
        },
        monitoring: policy.monitoring,
        retention: policy.retention,
        review: policy.review,
    };
}
function problem(status, title, detail) {
    return { status, body: { type: 'about:blank', title, status, detail } };
}
/**
 * The single response for "no such session" and "not your session".
 *
 * Distinguishing them would turn this endpoint into an enumeration oracle for
 * another tenant's assessments.
 */
function notFoundSession() {
    return problem(404, 'Not Found', 'no such session');
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parsePositiveInt(value) {
    if (value === undefined)
        return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
//# sourceMappingURL=routes.js.map