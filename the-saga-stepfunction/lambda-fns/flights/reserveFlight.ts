/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable func-names */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import { DynamoDB } from 'aws-sdk';
import { ReserveFlightResponse } from '../contracts/reserveFlight';

export {};

/* input example:
 *  { trip_id: some_guid,
 *    depart: london,
 *    depart_at: some_date,
 *    arrive: dublin,
 *    arrive_at: some_date,
 *    hotel: holiday inn,
 *    check_in: some_date,
 *    check_out: some_date,
 *    rental: volvo,
 *    rental_from: some_date,
 *    rental_to: some_date
 *  }
 */
exports.handler = async function(event:any): Promise<ReserveFlightResponse> {
  console.log("request:", JSON.stringify(event, undefined, 2));

  const flightBookingID = hashCode(`${event.trip_id}${event.depart}${event.arrive}`);

  // If we passed the parameter to fail this step 
  if(event.run_type === 'failFlightsReservation'){
    throw new Error('Failed to book the flights');
  }

  // create AWS SDK clients
  const dynamo = new DynamoDB();

  const params = {
    TableName: process.env.TABLE_NAME ?? 'undefined',
    Item: {
      'pk' : {S: event.trip_id},
      'sk' : {S: `FLIGHT#${flightBookingID}`},
      'type': {S: 'Flight'},
      'trip_id' : {S: event.trip_id},
      'id': {S: flightBookingID},
      'depart' : {S: event.depart},
      'depart_at': {S: event.depart_at},
      'arrive': {S: event.arrive},
      'arrive_at': {S: event.arrive_at},
      'transaction_status': {S: 'pending'}
    }
  };
  
  // Call DynamoDB to add the item to the table
  const result = await dynamo.putItem(params).promise().catch((error: any) => {
    throw new Error(error);
  });

  console.log('inserted flight booking:');
  console.log(result);

  // return status of ok
  return {
    status: "ok",
    booking_id: flightBookingID
  };
};

function hashCode(s:string): string {
  let h:any;

  // eslint-disable-next-line no-plusplus
  for(let i = 0; i < s.length; i++){
    // eslint-disable-next-line no-bitwise
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }

  return `${Math.abs(h)}`;
}