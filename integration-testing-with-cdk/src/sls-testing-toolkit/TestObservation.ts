export interface TestObservation {
  observerId: string;
  timestamp: number;
  data: Record<string, any>;
}
