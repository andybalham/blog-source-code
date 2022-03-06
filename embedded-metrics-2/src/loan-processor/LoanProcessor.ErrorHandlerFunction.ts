/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */

interface ErrorDetails {
  stateMachineName: string;
  failedStateName: string;
  correlationId: string;
  cause: {
    errorType: string;
    errorMessage: string;
    trace: string;
  };
}
export const handler = async (event: ErrorDetails): Promise<void> => {
  //
  console.log(
    JSON.stringify(
      {
        StateMachine: event.stateMachineName,
        ErrorCount: 1,
        CorrelationId: event.correlationId,
        FailedState: event.failedStateName,
        Cause: event.cause,
      },
      null,
      2
    )
  );
};
