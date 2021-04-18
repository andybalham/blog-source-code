#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
// eslint-disable-next-line max-classes-per-file
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';
// import * as logs from '@aws-cdk/aws-logs';
import sfn = require('@aws-cdk/aws-stepfunctions');
import sfnTasks = require('@aws-cdk/aws-stepfunctions-tasks');

const functionEntry = path.join(__dirname, '..', 'src', 'functions', 'index.ts');

export default class ProcessApplicationStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // State machine functions

    const performIdentityCheckFunction = this.addFunction('PerformIdentityCheck');
    const performAffordabilityCheckFunction = this.addFunction('PerformAffordabilityCheck');
    const sendEmailFunction = this.addFunction('SendEmail');
    const notifyUnderwriterFunction = this.addFunction('NotifyUnderwriter');

    // stateMachineType: sfn.StateMachineType.EXPRESS,
    // logs: {
    //   destination: new logs.LogGroup(this, 'ProcessApplicationLogGroup'),
    //   level: sfn.LogLevel.ALL,
    // },

    // State machine

    const performIdentityChecks = new sfn.Map(this, 'PerformIdentityChecks', {
      inputPath: '$.application',
      itemsPath: '$.applicants',
      resultPath: '$.identityResults',
    }).iterator(
      new sfnTasks.LambdaInvoke(this, 'PerformIdentityCheck', {
        lambdaFunction: performIdentityCheckFunction,
        payloadResponseOnly: true,
      })
    );

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

    const performAcceptTasks = new sfn.Parallel(this, 'PerformAcceptTasks').branch(
      new sfnTasks.LambdaInvoke(this, 'SendAcceptEmail', {
        lambdaFunction: sendEmailFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          emailType: 'ACCEPT',
          'application.$': '$.application',
        }),
      })
    );

    const performReferTasks = new sfn.Parallel(this, 'PerformReferTasks').branch(
      new sfnTasks.LambdaInvoke(this, 'SendReferEmail', {
        lambdaFunction: sendEmailFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          emailType: 'REFER',
          'application.$': '$.application',
        }),
      }),
      new sfnTasks.LambdaInvoke(this, 'NotifyUnderwriter', {
        lambdaFunction: notifyUnderwriterFunction,
        payloadResponseOnly: true,
        inputPath: '$.application',
      })
    );

    const performDeclineTasks = new sfn.Parallel(this, 'PerformDeclineTasks').branch(
      new sfnTasks.LambdaInvoke(this, 'SendDeclineEmail', {
        lambdaFunction: sendEmailFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          emailType: 'Decline',
          'application.$': '$.application',
        }),
      })
    );

    const processApplicationStateMachine = new sfn.StateMachine(
      this,
      'ProcessApplicationStateMachine',
      {
        definition: sfn.Chain.start(
          performIdentityChecks
            .next(aggregateIdentityResults)
            .next(
              new sfn.Choice(this, 'EvaluateIdentityResults')
                .when(overallIdentityResultIsFalse, performDeclineTasks)
                .otherwise(
                  performAffordabilityCheck.next(
                    new sfn.Choice(this, 'EvaluateAffordabilityResult')
                      .when(affordabilityResultIsBad, performDeclineTasks)
                      .when(affordabilityResultIsPoor, performReferTasks)
                      .otherwise(performAcceptTasks)
                  )
                )
            )
        ),
      }
    );

    new cdk.CfnOutput(this, 'ProcessApplicationStateMachine.ARN', {
      value: processApplicationStateMachine.stateMachineArn,
    });
  }

  private functionTask(
    taskId: string,
    performIdentityCheckFunction: lambda.Function,
    props?: Omit<sfnTasks.LambdaInvokeProps, 'lambdaFunction'>
  ): sfnTasks.LambdaInvoke {
    const defaultProps = {
      lambdaFunction: performIdentityCheckFunction,
      payloadResponseOnly: true,
    };
    return new sfnTasks.LambdaInvoke(this, taskId, { ...defaultProps, ...props });
  }

  private addFunction(functionName: string): lambda.Function {
    return new lambdaNodejs.NodejsFunction(this, `${functionName}Function`, {
      entry: functionEntry,
      handler: `handle${functionName}`,
    });
  }
}
