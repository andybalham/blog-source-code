/* eslint-disable import/order */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-new */
/* eslint-disable max-classes-per-file */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';
import { StateMachineBuilder } from '../src/constructs/StateMachineBuilder-Original';
import sfn = require('@aws-cdk/aws-stepfunctions');
import sfnTasks = require('@aws-cdk/aws-stepfunctions-tasks');

const functionEntry = path.join(__dirname, '..', 'src', 'functions', 'index.ts');

export class ProcessApplicationBuilderStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    // State machine functions

    const performIdentityCheckFunction = this.addFunction('PerformIdentityCheck');
    const performAffordabilityCheckFunction = this.addFunction('PerformAffordabilityCheck');
    const sendEmailFunction = this.addFunction('SendEmail');
    const notifyUnderwriterFunction = this.addFunction('NotifyUnderwriter');

    const performIdentityCheck = new sfnTasks.LambdaInvoke(this, 'PerformIdentityCheck', {
      lambdaFunction: performIdentityCheckFunction,
      payloadResponseOnly: true,
    });

    const aggregateIdentityResults = new sfnTasks.EvaluateExpression(
      this,
      'AggregateIdentityResultsExpression',
      {
        expression: '($.identityResults).every((r) => r.success)',
        resultPath: '$.overallIdentityResult',
      }
    );

    const overallIdentityResultIsFalse = sfn.Condition.booleanEquals(
      '$.overallIdentityResult',
      false
    );

    const performAffordabilityCheck = new sfnTasks.LambdaInvoke(this, 'PerformAffordabilityCheck', {
      lambdaFunction: performAffordabilityCheckFunction,
      payloadResponseOnly: true,
      inputPath: '$.application',
      resultPath: '$.affordabilityResult',
    });

    const affordabilityResultIsBad = sfn.Condition.stringEquals('$.affordabilityResult', 'BAD');
    const affordabilityResultIsPoor = sfn.Condition.stringEquals('$.affordabilityResult', 'POOR');

    const sendAcceptEmail = new sfnTasks.LambdaInvoke(this, 'SendAcceptEmail', {
      lambdaFunction: sendEmailFunction,
      payloadResponseOnly: true,
      payload: sfn.TaskInput.fromObject({
        emailType: 'ACCEPT',
        'application.$': '$.application',
      }),
    });

    const sendReferEmail = new sfnTasks.LambdaInvoke(this, 'SendReferEmail', {
      lambdaFunction: sendEmailFunction,
      payloadResponseOnly: true,
      payload: sfn.TaskInput.fromObject({
        emailType: 'REFER',
        'application.$': '$.application',
      }),
    });

    const notifyUnderwriter = new sfnTasks.LambdaInvoke(this, 'NotifyUnderwriter', {
      lambdaFunction: notifyUnderwriterFunction,
      payloadResponseOnly: true,
      inputPath: '$.application',
    });

    const sendDeclineEmail = new sfnTasks.LambdaInvoke(this, 'SendDeclineEmail', {
      lambdaFunction: sendEmailFunction,
      payloadResponseOnly: true,
      payload: sfn.TaskInput.fromObject({
        emailType: 'Decline',
        'application.$': '$.application',
      }),
    });

    const processApplicationStateMachine = new sfn.StateMachine(
      this,
      'ProcessApplicationStateMachine',
      {
        definition: new StateMachineBuilder()

          .map('PerformIdentityChecks', {
            inputPath: '$.application',
            itemsPath: '$.applicants',
            resultPath: '$.identityResults',
            iterator: new StateMachineBuilder().perform(performIdentityCheck),
          })
          .perform(aggregateIdentityResults)

          .choice('EvaluateIdentityResults', {
            choices: [{ when: overallIdentityResultIsFalse, next: 'PerformDeclineTasks' }],
          })

          .perform(performAffordabilityCheck, {
            catch: [
              { errors: ['ALL'], goto: 'ErrorHandler' },
              { errors: ['ALL'], goto: 'ErrorHandler' },
              { errors: ['ALL'], goto: 'ErrorHandler' },
            ],
          })

          .choice('EvaluateAffordabilityCheck', {
            choices: [
              { when: affordabilityResultIsBad, next: 'PerformDeclineTasks' },
              { when: affordabilityResultIsPoor, next: 'PerformReferTasks' },
            ],
          })

          .parallel('PerformAcceptTasks', {
            branches: [new StateMachineBuilder().perform(sendAcceptEmail)],
          })
          .end()

          .parallel('PerformReferTasks', {
            branches: [
              new StateMachineBuilder().perform(sendReferEmail),
              new StateMachineBuilder().perform(notifyUnderwriter),
            ],
          })
          .end()

          .parallel('PerformDeclineTasks', {
            branches: [new StateMachineBuilder().perform(sendDeclineEmail)],
          })
          .end()

          .build(this),
      }
    );
  }

  private addFunction(functionName: string): lambda.Function {
    return new lambdaNodejs.NodejsFunction(this, `${functionName}Function`, {
      entry: functionEntry,
      handler: `handle${functionName}`,
    });
  }
}
