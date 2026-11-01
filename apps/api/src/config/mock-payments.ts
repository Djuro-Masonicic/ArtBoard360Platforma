import { env } from './env';

// Temporary test mode is also available in production by explicit product decision.
// Keep the same server-side switch for checkout visibility and settlement.
export function mockPaymentsEnabled() {
  return env.mockPaymentsEnabled;
}
