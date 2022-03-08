/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */

interface StateMachineErrorDetails {
  processName: string;
  stateMachineName: string;
  failedStateName: string;
  correlationId: string;
  cause: {
    errorType: string;
    errorMessage: string;
    trace: string;
  };
}
export const handler = async (event: StateMachineErrorDetails): Promise<void> => {
  //
  console.log(
    JSON.stringify(
      {
        // Dimensions
        ProcessName: event.processName,
        // Metrics
        ErrorCount: 1,
        // Properties
        StateMachine: event.stateMachineName,
        CorrelationId: event.correlationId,
        FailedState: event.failedStateName,
        Cause: event.cause,
      },
      null,
      2
    )
  );
};
