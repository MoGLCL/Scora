import { TrustEventType } from '../events/types.ts';
import { type Validator } from './schema.ts';
export declare const PAYLOAD_SCHEMAS: Readonly<Record<TrustEventType, Validator<unknown>>>;
export declare function payloadSchemaFor(type: TrustEventType): Validator<unknown>;
/** Event types with no registered schema. Should always be empty; asserted in tests. */
export declare function eventTypesMissingSchemas(): readonly string[];
//# sourceMappingURL=payloads.d.ts.map