#!/usr/bin/env node
/* eslint-disable import/first */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
// eslint-disable-next-line max-classes-per-file
import * as cdk from '@aws-cdk/core';
import sfnTasks = require('@aws-cdk/aws-stepfunctions-tasks');
import sfn = require('@aws-cdk/aws-stepfunctions');
import { StateMachineBuilder, StateMachineWithGraph } from '../src/constructs';
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
    const answerDog = returnAnswer(scope, 'Dog');
    const answerCow = returnAnswer(scope, 'Cow');

    return new StateMachineBuilder()
      .perform(evaluateHasLegs)
      .perform(evaluateHasScales)
      .perform(evaluateHasMoreThanTwoLegs)
      .perform(evaluateEatsHay)
      .perform(evaluateCanFly)
      .build(scope);
    /*      
      .choice('HasLegs', {
        choices: [{ when: answerIsTrue, goto: evaluateHasMoreThanTwoLegs.id }],
      })

      .perform(evaluateHasScales)
      .choice('HasScales', {
        choices: [{ when: answerIsTrue, goto: answerSnake.id }],
      })

      .perform(answerWorm)
      .end()
      .perform(answerSnake)
      .end()

      .perform(evaluateHasMoreThanTwoLegs)
      .choice('HasMoreThanTwoLegs', {
        choices: [{ when: answerIsTrue, goto: evaluateEatsHay.id }],
      })

      .perform(evaluateCanFly)
      .choice('CanFly', {
        choices: [{ when: answerIsTrue, goto: answerDuck.id }],
      })

      .perform(answerHuman)
      .end()
      .perform(answerDuck)
      .end()

      .perform(evaluateEatsHay)
      .choice('EatsHay', {
        choices: [{ when: answerIsTrue, goto: 'AnswerCow' }],
      })

      .perform(answerDog)
      .end()
      .perform(answerCow)
      .end()
      .build(scope)
*/
  }
}
