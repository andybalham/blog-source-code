import { ReserveFlightResult } from './reserveFlight';

export interface CancelFlightRequest {
  trip_id: string;
  ReserveFlightResult: ReserveFlightResult;
}

export interface CancelFlightResponse {
  status: string;
}
