/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import { Tags } from '@aws-cdk/core';
// import ProcessApplicationStack from './ProcessApplicationStack';
import TwentyQuestionsStack from './TwentyQuestionsStack';
import TwentyQuestionsBuilderStack from './TwentyQuestionsBuilderStack';

const app = new cdk.App();
Tags.of(app).add('app', 'blog-step-functions-cdk');

// const processApplicationStack = new ProcessApplicationStack(app, 'ProcessApplicationStack');
// Tags.of(processApplicationStack).add('stack', 'ProcessApplication');

const twentyQuestionsStack = new TwentyQuestionsStack(app, 'TwentyQuestionsStack');
Tags.of(twentyQuestionsStack).add('stack', 'TwentyQuestions');

const twentyQuestionsBuilderStack = new TwentyQuestionsBuilderStack(app, 'TwentyQuestionsBuilderStack');
Tags.of(twentyQuestionsBuilderStack).add('stack', 'TwentyQuestionsBuilder');
