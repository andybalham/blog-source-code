/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import { IntegrationTestStack } from '@andybalham/sls-testing-toolkit';
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import LoanProcessor from '../src/loan-processor/LoanProcessor';

export interface LoanProcessorTestStackProps {
  creditReferenceUrlParameterName: string;
  identityCheckUrlParameterName: string;
}

export default class LoanProcessorTestStack extends IntegrationTestStack {
  //
  static readonly StackId = 'LoanProcessorTestStack';

  static readonly LoanProcessorAlarmSubscriberId = 'LoanProcessorAlarmSubscriber';

  static readonly StateMachineId = 'StateMachine';

  constructor(scope: cdk.Construct, id: string, props: LoanProcessorTestStackProps) {
    super(scope, id, {
      testStackId: LoanProcessorTestStack.StackId,
      testFunctionIds: [LoanProcessorTestStack.LoanProcessorAlarmSubscriberId],
    });

    const alarmTopic = new sns.Topic(this, 'LoanProcessorAlarmTopic');
    this.addSNSTopicSubscriber(alarmTopic, LoanProcessorTestStack.LoanProcessorAlarmSubscriberId);

    const loanProcessor = new LoanProcessor(this, 'LoanProcessor', {
      creditReferenceUrlParameterName: props.creditReferenceUrlParameterName,
      identityCheckUrlParameterName: props.identityCheckUrlParameterName,
      alarmTopic,
    });

    this.addTestResourceTag(loanProcessor.stateMachine, LoanProcessorTestStack.StateMachineId);

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: loanProcessor.stateMachine.stateMachineArn ?? '<undefined>',
      description: 'The ARN of the state machine',
    });
  }
}
