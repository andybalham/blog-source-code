export interface CreditReferenceRequest {
  firstName: string;
  lastName: string;
  postcode: string;
}

export enum CreditReferenceRating {
  Good = 'Good',
  Bad = 'Bad',
  Ugly = 'Ugly',
}

export interface CreditReferenceResponse {
  reference: string;
  rating: CreditReferenceRating;
}
