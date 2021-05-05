#!/usr/bin/env node
/* eslint-disable import/first */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
// eslint-disable-next-line max-classes-per-file
import * as cdk from '@aws-cdk/core';
import sfnTasks = require('@aws-cdk/aws-stepfunctions-tasks');
import sfn = require('@aws-cdk/aws-stepfunctions');
import { StateMachineBuilder as Builder, StateMachineWithGraph } from '../src/constructs';
import { writeGraphJson } from './utils';
// import * as logs from '@aws-cdk/aws-logs';

function returnAnswer(scope: cdk.Construct, answer: string): sfn.Pass {
  return new sfn.Pass(scope, `Answer${answer}`, {
    result: sfn.Result.fromString(answer),
  });
}

export default class TwentyQuestionsBuilderStack extends cdk.Stack {
  //
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    // State machine

    const stateMachine = new StateMachineWithGraph(this, 'TwentyQuestionsStateMachineBuilder', {
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

    return Builder.new()

      .perform(evaluateHasLegs)
      .choice('HasLegs', {
        choices: [{ when: answerIsTrue, next: evaluateHasMoreThanTwoLegs.id }],
        otherwise: evaluateHasScales.id,
      })

      .perform(evaluateHasMoreThanTwoLegs)
      .choice('HasMoreThanTwoLegs', {
        choices: [{ when: answerIsTrue, next: evaluateEatsHay.id }],
        otherwise: evaluateCanFly.id,
      })

      .perform(evaluateEatsHay)
      .choice('EatsHay', {
        choices: [{ when: answerIsTrue, next: answerCow.id }],
        otherwise: answerCat.id,
      })

      .perform(answerCow)
      .end()

      .perform(answerCat)
      .end()

      .perform(evaluateCanFly)
      .choice('CanFly', {
        choices: [{ when: answerIsTrue, next: answerDuck.id }],
        otherwise: answerHuman.id,
      })

      .perform(answerDuck)
      .end()

      .perform(answerHuman)
      .end()

      .perform(evaluateHasScales)
      .choice('HasScales', {
        choices: [{ when: answerIsTrue, next: answerSnake.id }],
        otherwise: answerWorm.id,
      })

      .perform(answerSnake)
      .end()

      .perform(answerWorm)
      .end()

      .build(scope);
  }
}
