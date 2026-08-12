import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DeveloperId, SessionId, TenantId, clampUnit, unsafeEpochMs } from '@scora/trust-core';
import { ComparisonBasis } from "./contract.js";
import { MINIMUM_SESSIONS_TO_ESTABLISH, TRACKED_FEATURES, buildPopulation, buildProfile, compare, notableDeviations, } from "./profile.js";
import { medianAbsoluteDeviation, percentile, recencyWeight, robustZScore, weightedMedian, } from "./statistics.js";
import { inMemoryBaselineStore } from "./store.js";
const TENANT = TenantId.unsafe('tnt_test');
const DEV = DeveloperId.unsafe('dev_test');
const OTHER = DeveloperId.unsafe('dev_other');
const NOW = unsafeEpochMs(1_760_000_000_000);
const DAY = 86_400_000;
function observation(index, metrics, overrides = {}) {
    const { coverage, ...rest } = overrides;
    return {
        tenantId: TENANT,
        developerId: DEV,
        sessionId: SessionId.unsafe(`sess_${index}`),
        observedAt: unsafeEpochMs(NOW - index * DAY),
        coverage: clampUnit(coverage ?? 1),
        metrics,
        ...rest,
    };
}
/** n sessions with a stable typing rate, plus optional extra metrics. */
function stableHistory(count, rate = 300, extra = {}, developerId = DEV) {
    return Array.from({ length: count }, (_, index) => observation(index, { 'typing.rate_cpm': rate + (index % 2 === 0 ? 5 : -5), ...extra }, {
        developerId,
    }));
}
describe('robust statistics', () => {
    it('computes an interpolated percentile', () => {
        assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
        assert.equal(percentile([10], 0.75), 10);
        assert.equal(percentile([], 0.5), null);
    });
    it('resists outliers where a mean would not', () => {
        const clean = [100, 102, 98, 101, 99];
        const withOutlier = [...clean, 5_000];
        const madClean = medianAbsoluteDeviation(clean);
        const madOutlier = medianAbsoluteDeviation(withOutlier);
        // A single extreme session must not redefine what normal means.
        assert.ok(madOutlier < madClean * 3, `MAD moved from ${madClean} to ${madOutlier}`);
    });
    it('weights observations by reliability', () => {
        // The 1000 value is heavily downweighted and must not become the centre.
        const value = weightedMedian([100, 100, 100, 1000], [1, 1, 1, 0.01]);
        assert.equal(value, 100);
    });
    it('ignores zero-weight observations entirely', () => {
        assert.equal(weightedMedian([5, 500], [1, 0]), 5);
    });
    it('refuses a z-score when dispersion is zero', () => {
        // Identical history is far more likely to mean too little data than genuine
        // perfect consistency; claiming infinite significance would be fabrication.
        assert.equal(robustZScore(500, 100, 0), null);
    });
    it('decays older observations', () => {
        assert.equal(recencyWeight(NOW, NOW), 1);
        const halfLife = recencyWeight(NOW - 90 * DAY, NOW, 90);
        assert.ok(Math.abs(halfLife - 0.5) < 1e-9);
        assert.ok(recencyWeight(NOW - 365 * DAY, NOW, 90) < 0.1);
    });
});
describe('profile construction', () => {
    it('is not established below the session minimum', () => {
        const profile = buildProfile(TENANT, DEV, stableHistory(MINIMUM_SESSIONS_TO_ESTABLISH - 1), {
            now: NOW,
        });
        assert.equal(profile.established, false);
        assert.ok(profile.dimensions.size > 0, 'it still accumulates while unestablished');
    });
    it('becomes established at the minimum', () => {
        const profile = buildProfile(TENANT, DEV, stableHistory(MINIMUM_SESSIONS_TO_ESTABLISH), {
            now: NOW,
        });
        assert.equal(profile.established, true);
    });
    it('never claims full confidence', () => {
        const profile = buildProfile(TENANT, DEV, stableHistory(50), { now: NOW });
        assert.ok(profile.confidence < 1);
    });
    it('grows confidence with sessions', () => {
        const few = buildProfile(TENANT, DEV, stableHistory(4), { now: NOW });
        const many = buildProfile(TENANT, DEV, stableHistory(30), { now: NOW });
        assert.ok(many.confidence > few.confidence);
    });
    it('ignores other developers observations', () => {
        const mixed = [
            ...stableHistory(5, 300),
            ...Array.from({ length: 20 }, (_, i) => observation(i, { 'typing.rate_cpm': 2_000 }, { developerId: OTHER })),
        ];
        const profile = buildProfile(TENANT, DEV, mixed, { now: NOW });
        assert.equal(profile.sessionsObserved, 5);
        assert.ok(profile.dimensions.get('typing.rate_cpm').median < 400);
    });
    it('downweights sessions with poor telemetry', () => {
        const history = [
            ...stableHistory(5, 300),
            observation(9, { 'typing.rate_cpm': 3_000 }, { coverage: 0.02 }),
        ];
        const profile = buildProfile(TENANT, DEV, history, { now: NOW });
        assert.ok(profile.dimensions.get('typing.rate_cpm').median < 400, 'a barely-observed session must not define the baseline');
    });
    it('tracks no risk-contributing feature', () => {
        // A baseline exists to interpret behaviour fairly, not to accumulate a
        // permanent per-developer record of concerns.
        for (const feature of TRACKED_FEATURES) {
            assert.doesNotMatch(feature, /unexplained|unadapted|dependency_index|integrity_violation|device_context/, `${feature} would build a history of suspicion`);
        }
    });
    it('handles a developer with no history at all', () => {
        const profile = buildProfile(TENANT, DEV, [], { now: NOW });
        assert.equal(profile.sessionsObserved, 0);
        assert.equal(profile.established, false);
        assert.equal(profile.dimensions.size, 0);
    });
});
describe('comparison fairness', () => {
    it('makes no comparison when there is no history', () => {
        const deviation = compare('typing.rate_cpm', 1_800, null);
        assert.equal(deviation.basis, ComparisonBasis.NONE);
        assert.equal(deviation.zScore, null);
        assert.equal(deviation.confidence, 0);
        assert.match(deviation.note, /not a finding/i);
    });
    it('makes no comparison against an unestablished profile', () => {
        const profile = buildProfile(TENANT, DEV, stableHistory(2), { now: NOW });
        assert.equal(compare('typing.rate_cpm', 1_800, profile).basis, ComparisonBasis.NONE);
    });
    it('does not fall back to the population by default', () => {
        const population = buildPopulation(TENANT, [
            buildProfile(TENANT, OTHER, stableHistory(10, 250, {}, OTHER), { now: NOW }),
        ]);
        // The default must be silence, not a comparison to strangers.
        const deviation = compare('typing.rate_cpm', 1_800, null, { population });
        assert.equal(deviation.basis, ComparisonBasis.NONE);
    });
    it('marks an opt-in population comparison as weak', () => {
        const population = buildPopulation(TENANT, [
            buildProfile(TENANT, OTHER, stableHistory(10, 250, {}, OTHER), { now: NOW }),
        ]);
        const deviation = compare('typing.rate_cpm', 1_800, null, {
            population,
            allowPopulationFallback: true,
        });
        assert.equal(deviation.basis, ComparisonBasis.POPULATION);
        assert.ok(deviation.confidence < 0.5, 'a population comparison is weak evidence about a person');
        assert.match(deviation.note, /weak evidence about an individual/i);
    });
    it('prefers the developer own history over the population', () => {
        const profile = buildProfile(TENANT, DEV, stableHistory(10, 900), { now: NOW });
        const population = buildPopulation(TENANT, [
            buildProfile(TENANT, OTHER, stableHistory(10, 200, {}, OTHER), { now: NOW }),
        ]);
        const deviation = compare('typing.rate_cpm', 910, profile, {
            population,
            allowPopulationFallback: true,
        });
        assert.equal(deviation.basis, ComparisonBasis.SELF);
        // A fast typist compared to themselves is unremarkable, even though the
        // population would call them a 4x outlier.
        assert.ok(Math.abs(deviation.zScore ?? 0) < 3);
    });
    it('does not flag a consistently fast developer', () => {
        const profile = buildProfile(TENANT, DEV, stableHistory(12, 1_200), { now: NOW });
        const deviations = [compare('typing.rate_cpm', 1_195, profile)];
        assert.deepEqual(notableDeviations(deviations), []);
    });
    it('does not flag a consistently slow developer', () => {
        const profile = buildProfile(TENANT, DEV, stableHistory(12, 60), { now: NOW });
        assert.deepEqual(notableDeviations([compare('typing.rate_cpm', 62, profile)]), []);
    });
    it('reports a genuine departure from a person own pattern', () => {
        const profile = buildProfile(TENANT, DEV, stableHistory(12, 300), { now: NOW });
        const deviation = compare('typing.rate_cpm', 3_000, profile);
        assert.equal(deviation.basis, ComparisonBasis.SELF);
        assert.ok((deviation.zScore ?? 0) > 3);
        assert.equal(notableDeviations([deviation]).length, 1);
    });
    it('phrases even a large deviation as a question', () => {
        const profile = buildProfile(TENANT, DEV, stableHistory(12, 300), { now: NOW });
        const deviation = compare('typing.rate_cpm', 3_000, profile);
        assert.match(deviation.note, /question rather than a finding/i);
        assert.doesNotMatch(deviation.note, /cheat|fraud|suspicious/i);
    });
    it('uses a high threshold for notability', () => {
        const profile = buildProfile(TENANT, DEV, stableHistory(12, 300), { now: NOW });
        // Roughly 2 sigma: ordinary session-to-session variation, not a finding.
        const deviation = compare('typing.rate_cpm', 312, profile);
        assert.deepEqual(notableDeviations([deviation]), []);
    });
    it('never reports a population comparison as notable', () => {
        const population = buildPopulation(TENANT, [
            buildProfile(TENANT, OTHER, stableHistory(10, 200, {}, OTHER), { now: NOW }),
        ]);
        const deviation = compare('typing.rate_cpm', 5_000, null, {
            population,
            allowPopulationFallback: true,
        });
        assert.deepEqual(notableDeviations([deviation]), [], 'differing from other people is not a finding about a person');
    });
});
describe('population statistics', () => {
    it('counts each developer once regardless of session count', () => {
        const prolific = buildProfile(TENANT, DEV, stableHistory(100, 1_000), { now: NOW });
        const occasional = buildProfile(TENANT, OTHER, stableHistory(4, 200, {}, OTHER), { now: NOW });
        const population = buildPopulation(TENANT, [prolific, occasional]);
        assert.equal(population.developersObserved, 2);
        const median = population.dimensions.get('typing.rate_cpm').median;
        // With one value per developer the median sits between them, not near the
        // prolific developer's rate.
        assert.ok(median > 200 && median < 1_000, `median was ${median}`);
    });
    it('is empty when no profiles exist', () => {
        const population = buildPopulation(TENANT, []);
        assert.equal(population.developersObserved, 0);
        assert.equal(population.dimensions.size, 0);
    });
});
describe('baseline store', () => {
    it('round-trips a profile', async () => {
        const store = inMemoryBaselineStore();
        const profile = buildProfile(TENANT, DEV, stableHistory(6), { now: NOW });
        await store.save(profile);
        const loaded = await store.load(TENANT, DEV);
        assert.equal(loaded?.developerId, DEV);
        assert.equal(loaded?.sessionsObserved, 6);
    });
    it('returns null for an unknown developer', async () => {
        const store = inMemoryBaselineStore();
        assert.equal(await store.load(TENANT, DEV), null);
    });
    it('isolates tenants', async () => {
        const store = inMemoryBaselineStore();
        await store.save(buildProfile(TENANT, DEV, stableHistory(6), { now: NOW }));
        const otherTenant = TenantId.unsafe('tnt_other');
        assert.equal(await store.load(otherTenant, DEV), null, 'one tenant must never be served another tenant data');
    });
});
//# sourceMappingURL=profile.test.js.map