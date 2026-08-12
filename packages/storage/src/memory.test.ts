import { runStoreConformance } from './conformance.ts';
import { inMemoryEventStore } from './memory.ts';

runStoreConformance('inMemoryEventStore', () => inMemoryEventStore());
