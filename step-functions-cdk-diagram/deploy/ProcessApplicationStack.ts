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
// eslint-disable-next-line import/first
import { StateMachineWithDiagram } from '../src/constructs';

const functionEntry = path.join(__dirname, '..', 'src', 'functions', 'index.ts');

export default class ProcessApplicationStack extends cdk.Stack {
  private performIdentityCheckFunction: lambda.Function;

  private performAffordabilityCheckFunction: lambda.Function;

  private sendEmailFunction: lambda.Function;

  private notifyUnderwriterFunction: lambda.Function;

  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // State machine functions

    this.performIdentityCheckFunction = this.addFunction('PerformIdentityCheck');
    this.performAffordabilityCheckFunction = this.addFunction('PerformAffordabilityCheck');
    this.sendEmailFunction = this.addFunction('SendEmail');
    this.notifyUnderwriterFunction = this.addFunction('NotifyUnderwriter');

    // State machine

    const processApplicationStateMachine = new StateMachineWithDiagram(
      this,
      'ProcessApplicationStateMachine',
      {
        // stateMachineType: sfn.StateMachineType.EXPRESS,
        // logs: {
        //   destination: new logs.LogGroup(this, 'ProcessApplicationLogGroup'),
        //   level: sfn.LogLevel.ALL,
        // },

        getDefinition: (s): sfn.IChainable => this.getProcessApplicationDefinition(s),
      }
    );

    new cdk.CfnOutput(this, 'ProcessApplicationStateMachine.ARN', {
      value: processApplicationStateMachine.stateMachineArn,
    });
  }

  private getProcessApplicationDefinition(scope: cdk.Construct): sfn.IChainable {
    const performIdentityChecks = new sfn.Map(scope, 'PerformIdentityChecks', {
      inputPath: '$.application',
      itemsPath: '$.applicants',
      resultPath: '$.identityResults',
    }).iterator(
      new sfnTasks.LambdaInvoke(scope, 'PerformIdentityCheck', {
        lambdaFunction: this.performIdentityCheckFunction,
        payloadResponseOnly: true,
      })
    );

    const aggregateIdentityResults = new sfnTasks.EvaluateExpression(
      scope,
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

    const performAffordabilityCheck = new sfnTasks.LambdaInvoke(
      scope,
      'PerformAffordabilityCheck',
      {
        lambdaFunction: this.performAffordabilityCheckFunction,
        payloadResponseOnly: true,
        inputPath: '$.application',
        resultPath: '$.affordabilityResult',
      }
    );

    const affordabilityResultIsBad = sfn.Condition.stringEquals('$.affordabilityResult', 'BAD');
    const affordabilityResultIsPoor = sfn.Condition.stringEquals('$.affordabilityResult', 'POOR');

    const performAcceptTasks = new sfn.Parallel(scope, 'PerformAcceptTasks').branch(
      new sfnTasks.LambdaInvoke(scope, 'SendAcceptEmail', {
        lambdaFunction: this.sendEmailFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          emailType: 'ACCEPT',
          'application.$': '$.application',
        }),
      })
    );

    const performReferTasks = new sfn.Parallel(scope, 'PerformReferTasks').branch(
      new sfnTasks.LambdaInvoke(scope, 'SendReferEmail', {
        lambdaFunction: this.sendEmailFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          emailType: 'REFER',
          'application.$': '$.application',
        }),
      }),
      new sfnTasks.LambdaInvoke(scope, 'NotifyUnderwriter', {
        lambdaFunction: this.notifyUnderwriterFunction,
        payloadResponseOnly: true,
        inputPath: '$.application',
      })
    );

    const performDeclineTasks = new sfn.Parallel(scope, 'PerformDeclineTasks').branch(
      new sfnTasks.LambdaInvoke(scope, 'SendDeclineEmail', {
        lambdaFunction: this.sendEmailFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          emailType: 'Decline',
          'application.$': '$.application',
        }),
      })
    );

    return sfn.Chain.start(
      performIdentityChecks
        .next(aggregateIdentityResults)
        .next(
          new sfn.Choice(scope, 'EvaluateIdentityResults')
            .when(overallIdentityResultIsFalse, performDeclineTasks)
            .otherwise(
              performAffordabilityCheck.next(
                new sfn.Choice(scope, 'EvaluateAffordabilityResult')
                  .when(affordabilityResultIsBad, performDeclineTasks)
                  .when(affordabilityResultIsPoor, performReferTasks)
                  .otherwise(performAcceptTasks)
              )
            )
        )
    );
  }

  private addFunction(functionName: string): lambda.Function {
    return new lambdaNodejs.NodejsFunction(this, `${functionName}Function`, {
      entry: functionEntry,
      handler: `handle${functionName}`,
    });
  }
}
