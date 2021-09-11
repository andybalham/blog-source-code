export interface ReserveFlightResponse {
  status: string;
  booking_id: string;
}

export interface ReserveFlightResult {
  Payload: ReserveFlightResponse;
}
