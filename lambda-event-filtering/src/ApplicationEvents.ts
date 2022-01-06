export interface ApplicationEvent {
  eventType: 'Created' | 'Updated' | 'Deleted';
}

export interface ApplicationCreatedEvent extends ApplicationEvent {
  loanAmount: number;
  postcode: string;
  applicationId: string;
}
