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

interface Animal {
  legCount: number;
  eatsHay: boolean;
  canFly: boolean;
  hasScales: boolean;
}

export { Application, Applicant, Animal };
