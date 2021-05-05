#!/usr/bin/env node
/* eslint-disable import/first */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
// eslint-disable-next-line max-classes-per-file
import * as cdk from '@aws-cdk/core';
import sfnTasks = require('@aws-cdk/aws-stepfunctions-tasks');
import sfn = require('@aws-cdk/aws-stepfunctions');
import { StateMachineWithGraph } from '../src/constructs';
import { writeGraphJson } from './utils';
// import * as logs from '@aws-cdk/aws-logs';

function returnAnswer(scope: cdk.Construct, answer: string): sfn.Pass {
  return new sfn.Pass(scope, `Answer${answer}`, {
    result: sfn.Result.fromString(answer),
  });
}

export default class TwentyQuestionsStack extends cdk.Stack {
  //

  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // State machine

    const stateMachine = new StateMachineWithGraph(this, 'TwentyQuestionsStateMachine', {
      // stateMachineType: sfn.StateMachineType.EXPRESS,
      // logs: {
      //   destination: new logs.LogGroup(this, 'TwentyQuestionsLogGroup'),
      //   level: sfn.LogLevel.ALL,
      // },

      getDefinition: (definitionScope): sfn.IChainable => this.getDefinition(definitionScope),
    });

    writeGraphJson(stateMachine);

    new cdk.CfnOutput(this, 'TwentyQuestionsStateMachine.ARN', {
      value: stateMachine.stateMachineArn,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  private getDefinition(scope: cdk.Construct): sfn.IChainable {
    //
    const answerIsTrue = sfn.Condition.booleanEquals('$.answer', true);

    const evaluateHasLegs = new sfnTasks.EvaluateExpression(scope, 'EvaluateHasLegs', {
      expression: '($.animal.legCount) > 0',
      resultPath: '$.answer',
    });

    const evaluateHasScales = new sfnTasks.EvaluateExpression(scope, 'EvaluateHasScales', {
      expression: '($.animal.hasScales)',
      resultPath: '$.answer',
    });

    const evaluateHasMoreThanTwoLegs = new sfnTasks.EvaluateExpression(
      scope,
      'EvaluateHasMoreThanTwoLegs',
      {
        expression: '($.animal.legCount) > 2',
        resultPath: '$.answer',
      }
    );

    const evaluateEatsHay = new sfnTasks.EvaluateExpression(scope, 'EvaluateEatsHay', {
      expression: '($.animal.eatsHay)',
      resultPath: '$.answer',
    });

    const evaluateCanFly = new sfnTasks.EvaluateExpression(scope, 'EvaluateCanFly', {
      expression: '($.animal.canFly)',
      resultPath: '$.answer',
    });

    const answerWorm = returnAnswer(scope, 'Worm');
    const answerSnake = returnAnswer(scope, 'Snake');
    const answerHuman = returnAnswer(scope, 'Human');
    const answerDuck = returnAnswer(scope, 'Duck');
    const answerCat = returnAnswer(scope, 'Cat');
    const answerCow = returnAnswer(scope, 'Cow');

    return sfn.Chain.start(
      evaluateHasLegs.next(
        new sfn.Choice(scope, 'HasLegs')
          .when(
            answerIsTrue,
            evaluateHasMoreThanTwoLegs.next(
              new sfn.Choice(scope, 'HasMoreThanTwoLegs')
                .when(
                  answerIsTrue,
                  evaluateEatsHay.next(
                    new sfn.Choice(scope, 'EatsHay')
                      .when(answerIsTrue, answerCow)
                      .otherwise(answerCat)
                  )
                )
                .otherwise(
                  evaluateCanFly.next(
                    new sfn.Choice(scope, 'CanFly')
                      .when(answerIsTrue, answerDuck)
                      .otherwise(answerHuman)
                  )
                )
            )
          )
          .otherwise(
            evaluateHasScales.next(
              new sfn.Choice(scope, 'HasScales')
                .when(answerIsTrue, answerSnake)
                .otherwise(answerWorm)
            )
          )
      )
    );
  }
}
