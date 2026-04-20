/**
 * HealthService
 *
 * Handles the business logic for the health check.
 * In a real system, this could also check database connections,
 * third-party API availability, etc.
 */

interface HealthStatus {
  status: string;
  service: string;
}

export const getHealthStatus = (): HealthStatus => {
  return {
    status: 'ok',
    service: 'ArcPact',
  };
};
