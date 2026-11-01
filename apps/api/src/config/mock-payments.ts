import { env } from './env';

// An explicit server opt-in is required; production cannot enable the simulator.
export function mockPaymentsEnabled() {
  return env.mockPaymentsEnabled && ['development', 'test'].includes(env.nodeEnv);
}
