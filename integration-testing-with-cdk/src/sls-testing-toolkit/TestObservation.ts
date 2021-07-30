export default class TestObservation {
  //
  observerId: string;

  timestamp: number;

  data: Record<string, any>;

  static getCountById(observations: TestObservation[], observerId: string): number {
    return TestObservation.filterById(observations, observerId).length;
  }

  static filterById(
    observations: TestObservation[],
    observerId: string
  ): TestObservation[] {
    return observations.filter((o) => o.observerId === observerId);
  }
}
