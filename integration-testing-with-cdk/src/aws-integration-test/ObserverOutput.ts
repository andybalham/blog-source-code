
export interface ObserverOutput<T> {
  observerId: string;
  timestamp: number;
  event: T;
}
