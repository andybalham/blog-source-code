interface Application {
  reference: string;
  loanAmount: number;
  applicants: Applicant[];
}

interface Applicant {
  firstName: string;
  lastName: string;
  email: string;
  income: number;
}

export { Application, Applicant };
