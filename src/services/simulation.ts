import { logger } from '../utils/logger';

export type SimulationMode = 'down' | 'timeout' | 'slow' | 'invalid';

export interface SupplierSimulation {
  mode: SimulationMode;
  delayMs?: number;
  failureRate?: number; // 0-100 percentage for random failures
}

export interface SimulationStatus {
  active: boolean;
  supplierA: SupplierSimulation | null;
  supplierB: SupplierSimulation | null;
}

// In-memory state (resets on restart)
const simulationState = new Map<string, SupplierSimulation>();

/**
 * Set simulation for a supplier
 */
export function setSimulation(
  supplier: 'A' | 'B',
  config: SupplierSimulation | null
): void {
  const key = `supplier${supplier}`;

  if (config === null) {
    simulationState.delete(key);
    logger.info('Simulation disabled', { supplier });
  } else {
    simulationState.set(key, config);
    logger.info('Simulation enabled', { supplier, config });
  }
}

/**
 * Get simulation for a supplier
 */
export function getSimulation(supplier: 'A' | 'B'): SupplierSimulation | null {
  const key = `supplier${supplier}`;
  return simulationState.get(key) || null;
}

/**
 * Get overall simulation status
 */
export function getSimulationStatus(): SimulationStatus {
  const supplierA = getSimulation('A');
  const supplierB = getSimulation('B');

  return {
    active: supplierA !== null || supplierB !== null,
    supplierA,
    supplierB,
  };
}

/**
 * Clear all simulations
 */
export function clearAllSimulations(): void {
  simulationState.clear();
  logger.info('All simulations cleared');
}

/**
 * Helper to sleep for delay simulation
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a random failure should occur based on failure rate
 */
export function shouldRandomlyFail(failureRate: number): boolean {
  return Math.random() * 100 < failureRate;
}
