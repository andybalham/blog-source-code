import { Applicant, Application } from '../domain';

interface IdentityCheckResult {
  success: boolean;
}

export const handlePerformIdentityCheck = async (
  applicant: Applicant
): Promise<IdentityCheckResult> => ({
  success: applicant.lastName !== 'Potato',
});

export const handleAggregateIdentityResults = async (
  identityCheckResults: IdentityCheckResult[]
): Promise<boolean> => identityCheckResults.every((icr) => icr.success);

export const handlePerformAffordabilityCheck = async (
  application: Application
): Promise<string> => {
  const applicantIncomes = application.applicants.map((app) => app.income);
  const totalIncome = applicantIncomes.reduce((tot, inc) => tot + inc);
  if (totalIncome * 2 >= application.loanAmount) return 'GOOD';
  if (totalIncome * 3 >= application.loanAmount) return 'POOR';
  return 'BAD';
};

interface SendEmailRequest {
  emailType: string;
  application: Application;
}

export const handleSendEmail = async (sendEmailRequest: SendEmailRequest): Promise<void> => {
  sendEmailRequest.application.applicants.forEach((app) => {
    // eslint-disable-next-line no-console
    console.info(`Sending ${sendEmailRequest.emailType} to ${app.email}`);
  });
};

export const handleNotifyUnderwriter = async (application: Application): Promise<void> => {
  // eslint-disable-next-line no-console
  console.info(`Sending underwriter notification for ${application.reference}`);
};
