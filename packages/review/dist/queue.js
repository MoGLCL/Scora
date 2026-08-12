/**
 * In-memory implementation.
 *
 * Keyed by tenant first, not by review id, so a lookup with the wrong tenant
 * cannot return another tenant's row even by accident. Scoping by filtering
 * after the lookup would work until someone forgot the filter once.
 */
export function inMemoryReviewIndex() {
    const byTenant = new Map();
    return {
        async note(tenantId, reviewId, sessionId) {
            const reviews = byTenant.get(tenantId) ?? new Map();
            byTenant.set(tenantId, reviews);
            reviews.set(reviewId, sessionId);
        },
        async locate(tenantId, reviewId) {
            return byTenant.get(tenantId)?.get(reviewId) ?? null;
        },
        async list(tenantId, options = {}) {
            const reviews = byTenant.get(tenantId);
            if (reviews === undefined)
                return [];
            const all = [...reviews].map(([reviewId, sessionId]) => ({ reviewId, sessionId }));
            return options.limit === undefined ? all : all.slice(0, options.limit);
        },
    };
}
//# sourceMappingURL=queue.js.map