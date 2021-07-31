/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import FileEventPublisherTestStack from './stacks/test/FileEventPublisherTestStack-stt';
import FileHeaderIndexerTestStack from './stacks/test/FileHeaderIndexTestStack-stt';
import ResultCalculatorStateMachineTestStack from './stacks/test/ResultCalculatorStateMachineTestStack-stt';
import ResultCalculatorTestStack from './stacks/test/ResultCalculatorTestStack-stt';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'AffordabilityTestApp');

new FileEventPublisherTestStack(app, 'FileEventPublisherTestStack');
new FileHeaderIndexerTestStack(app, 'FileHeaderIndexerTestStack');
new ResultCalculatorStateMachineTestStack(app, 'ResultCalculatorStateMachineTestStack');
new ResultCalculatorTestStack(app, 'ResultCalculatorTestStack');
