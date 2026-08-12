import {
  CodeEvolutionEventType,
  RuntimeEventType,
  SkillEventType,
  TrustLayer,
  clampUnit,
  type EventId,
  type TrustEvent,
} from '@scora/trust-core';
import {
  SkillLevel,
  SkillObservationKind,
  type SkillClaim,
  type SkillObservation,
} from './contract.ts';

/**
 * Turning a session's events into observations about specific claimed skills.
 *
 * The hard problem here is attribution: knowing that a developer resolved four
 * runtime errors tells you nothing about their claimed PostgreSQL skill unless
 * you can tie the work to the skill. This module only ever attributes through
 * links the *producer* stated — `targetSkills` on a task, `skillId` on a
 * challenge — and never by guessing from a language name or a file extension.
 *
 * That is a deliberate choice to under-attribute. Inferring "they edited
 * `queries.sql`, so this is their SQL skill" would generate confident-looking
 * observations from filename coincidence, and those observations would end up in
 * a verdict about a person's competence. When the link is absent, the honest
 * output is `NOT_EXERCISED` and a suggestion to design a task that tests it.
 */

/** Reads the claimed-skill inventory out of the session's own evidence. */
export function collectClaims(events: readonly TrustEvent[]): readonly SkillClaim[] {
  const claims = new Map<string, SkillClaim>();

  for (const event of events) {
    if (event.type !== SkillEventType.SKILL_CLAIMED) continue;
    const payload = event.payload as {
      skillId?: unknown;
      skillName?: unknown;
      claimedLevel?: unknown;
      claimedYears?: unknown;
    };
    const skillId = typeof payload.skillId === 'string' ? payload.skillId : null;
    if (skillId === null) continue;

    // Last claim wins. A developer who corrects their own self-assessment
    // mid-session is doing exactly what the form invites, and the engine must not
    // hold the earlier number against them.
    claims.set(skillId, {
      skillId,
      skillName: typeof payload.skillName === 'string' ? payload.skillName : skillId,
      claimedLevel: asLevel(payload.claimedLevel),
      claimedYears: typeof payload.claimedYears === 'number' ? payload.claimedYears : null,
      claimedIn: event.eventId,
    });
  }

  return [...claims.values()];
}

/**
 * Groups observations by the skill they bear on.
 *
 * Only the two direct links are followed:
 *
 *   - `VERIFICATION_CHALLENGE_RESULT.skillId` — a challenge designed for one skill.
 *   - `TASK_STARTED.targetSkills` — the skills a task was written to exercise,
 *     which lets work inside that task's window be attributed to them.
 *
 * Work outside any declared task window is not attributed to anything. It still
 * counts for other layers; it just cannot be read as evidence about a *named*
 * skill, because nothing says which skill it belongs to.
 */
export function observeSkills(
  events: readonly TrustEvent[],
  claims: readonly SkillClaim[],
): ReadonlyMap<string, readonly SkillObservation[]> {
  const observations = new Map<string, SkillObservation[]>();
  const known = new Set(claims.map((claim) => claim.skillId));
  const add = (skillId: string, observation: SkillObservation): void => {
    if (!known.has(skillId)) return;
    const existing = observations.get(skillId);
    if (existing === undefined) observations.set(skillId, [observation]);
    else existing.push(observation);
  };

  for (const window of taskWindows(events)) {
    const inside = events.filter(
      (event) =>
        event.chainPosition > window.startedAt && event.chainPosition <= (window.endedAt ?? Infinity),
    );
    for (const skillId of window.targetSkills) {
      for (const observation of observeTaskWork(inside, window.difficulty)) {
        add(skillId, observation);
      }
    }
  }

  for (const event of events) {
    if (event.type !== SkillEventType.VERIFICATION_CHALLENGE_RESULT) continue;
    const payload = event.payload as {
      skillId?: unknown;
      passed?: unknown;
      score?: unknown;
      usedAssistance?: unknown;
    };
    if (typeof payload.skillId !== 'string') continue;

    const passed = payload.passed === true;
    const score = typeof payload.score === 'number' ? payload.score : passed ? 1 : 0;
    add(payload.skillId, {
      kind: passed ? SkillObservationKind.DEMONSTRATED : SkillObservationKind.CHALLENGE_FAILED,
      layer: TrustLayer.SKILL,
      detail: passed
        ? `Passed a targeted verification challenge, scoring ${score.toFixed(2)}${
            payload.usedAssistance === true ? ' with editor assistance available' : ''
          }.`
        : `Did not pass a targeted verification challenge, scoring ${score.toFixed(2)}.`,
      // A challenge is designed evidence, so it carries full weight — the one
      // place in this layer where a single observation is meant to be decisive.
      weight: clampUnit(passed ? Math.max(0.5, score) : Math.max(0.5, 1 - score)),
      confidence: clampUnit(0.9),
      evidence: [event.eventId],
    });
  }

  return observations;
}

interface TaskWindow {
  readonly taskId: string;
  readonly targetSkills: readonly string[];
  readonly difficulty: string;
  readonly startedAt: number;
  readonly endedAt: number | null;
}

/**
 * The chain-position span of each declared task.
 *
 * Windows are bounded by `chainPosition` rather than by timestamps: the engine
 * assigns it, so it cannot be skewed by a client clock, and a task window is
 * exactly the thing an attacker would want to stretch to have their good work
 * counted twice.
 */
export function taskWindows(events: readonly TrustEvent[]): readonly TaskWindow[] {
  const open = new Map<string, { targetSkills: readonly string[]; difficulty: string; startedAt: number }>();
  const windows: TaskWindow[] = [];

  for (const event of events) {
    if (event.type === SkillEventType.TASK_STARTED) {
      const payload = event.payload as {
        taskId?: unknown;
        targetSkills?: unknown;
        difficulty?: unknown;
      };
      if (typeof payload.taskId !== 'string') continue;
      open.set(payload.taskId, {
        targetSkills: Array.isArray(payload.targetSkills)
          ? payload.targetSkills.filter((skill): skill is string => typeof skill === 'string')
          : [],
        difficulty: typeof payload.difficulty === 'string' ? payload.difficulty : 'medium',
        startedAt: event.chainPosition,
      });
      continue;
    }

    if (event.type === SkillEventType.TASK_SUBMITTED) {
      const payload = event.payload as { taskId?: unknown };
      if (typeof payload.taskId !== 'string') continue;
      const started = open.get(payload.taskId);
      if (started === undefined) continue;
      windows.push({ taskId: payload.taskId, ...started, endedAt: event.chainPosition });
      open.delete(payload.taskId);
    }
  }

  // A task that never reported a submission stays open to the end of the log.
  // Truncated telemetry is not an unfinished task, and discarding the window
  // would silently drop the developer's work from the assessment.
  for (const [taskId, started] of open) {
    windows.push({ taskId, ...started, endedAt: null });
  }

  return windows;
}

/**
 * What work inside a task window says about the skills that task targeted.
 *
 * These are the behaviours that hold up as capability evidence in either
 * direction. Notably absent: typing speed, paste size, and completion acceptance
 * rate. Fast typing is not skill, a paste is not incompetence, and accepting a
 * completion the tests then pass is a developer using their tools.
 */
function observeTaskWork(events: readonly TrustEvent[], difficulty: string): readonly SkillObservation[] {
  const observations: SkillObservation[] = [];
  const idsOf = (...types: readonly string[]): readonly EventId[] =>
    events.filter((event) => types.includes(event.type)).map((event) => event.eventId);

  const testsPassing = events
    .filter((event) => event.type === RuntimeEventType.TEST_RUN_FINISHED)
    .filter((event) => {
      const payload = event.payload as { failed?: unknown };
      return payload.failed === 0;
    });
  if (testsPassing.length > 0) {
    observations.push({
      kind: SkillObservationKind.SUPPORTING,
      layer: TrustLayer.RUNTIME,
      detail: `Reached a fully passing test run ${testsPassing.length} time(s) on a ${difficulty} task.`,
      weight: clampUnit(0.6),
      confidence: clampUnit(0.75),
      evidence: testsPassing.map((event) => event.eventId),
    });
  }

  const resolved = idsOf(RuntimeEventType.ERROR_RESOLVED);
  if (resolved.length > 0) {
    observations.push({
      kind: SkillObservationKind.SUPPORTING,
      layer: TrustLayer.RUNTIME,
      detail: `Diagnosed and resolved ${resolved.length} runtime error(s) without abandoning the approach.`,
      weight: clampUnit(Math.min(0.8, 0.3 + resolved.length * 0.15)),
      confidence: clampUnit(0.8),
      evidence: resolved,
    });
  }

  const refactors = idsOf(CodeEvolutionEventType.REFACTOR_DETECTED);
  if (refactors.length > 0) {
    observations.push({
      kind: SkillObservationKind.SUPPORTING,
      layer: TrustLayer.CODE_EVOLUTION,
      detail: `Restructured working code ${refactors.length} time(s) — evidence of intent beyond making it compile.`,
      weight: clampUnit(0.5),
      confidence: clampUnit(0.65),
      evidence: refactors,
    });
  }

  const regressions = idsOf(RuntimeEventType.REGRESSION_DETECTED);
  const unresolved = idsOf(RuntimeEventType.RUNTIME_ERROR_OBSERVED).length - resolved.length;
  if (regressions.length > 0 && unresolved > 0) {
    // Counter-evidence, and deliberately conservative: this reads as "a hard
    // afternoon" at least as often as it reads as an overstated skill, which is
    // why `reconcileClaim` will not contradict a claim on this alone.
    observations.push({
      kind: SkillObservationKind.COUNTER,
      layer: TrustLayer.RUNTIME,
      detail: `${regressions.length} regression(s) alongside ${unresolved} error(s) left unresolved at submission.`,
      weight: clampUnit(0.4),
      confidence: clampUnit(0.5),
      evidence: [...regressions],
    });
  }

  return observations;
}

function asLevel(value: unknown): SkillLevel {
  switch (value) {
    case 'beginner':
      return SkillLevel.BEGINNER;
    case 'intermediate':
      return SkillLevel.INTERMEDIATE;
    case 'advanced':
      return SkillLevel.ADVANCED;
    case 'expert':
      return SkillLevel.EXPERT;
    default:
      return SkillLevel.NONE;
  }
}
