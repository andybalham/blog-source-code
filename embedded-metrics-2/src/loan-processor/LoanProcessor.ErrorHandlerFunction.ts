/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/prefer-default-export */

import { metricScope, Unit } from 'aws-embedded-metrics';

export const handler = metricScope(
  (metrics) =>
    async (event: any): Promise<void> => {
      //
      metrics
        .setNamespace('EmbeddedMetricsExample')
        // .putDimensions({ ProcessName: 'LoanProcessor' })
        .setDimensions({ ProcessName: 'LoanProcessor' })
        .putMetric('ErrorCount', 1, Unit.Count)
        .setProperty('CorrelationId', event.correlationId)
        .setProperty('StateMachineName', event.stateMachineName)
        .setProperty('FailedStateName', event.failedStateName)
        .setProperty('Cause', event.cause);

      // console.log(
      //   JSON.stringify(
      //     {
      //       // Dimensions
      //       ProcessName: event.processName,
      //       // Metrics
      //       ErrorCount: 1,
      //       // Properties
      //       StateMachine: event.stateMachineName,
      //       CorrelationId: event.correlationId,
      //       FailedStateName: event.failedStateName,
      //       Cause: event.cause,
      //     },
      //     null,
      //     2
      //   )
      // );
    }
);
