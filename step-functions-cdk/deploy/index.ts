/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import { Tags } from '@aws-cdk/core';
import ProcessApplicationStack from './ProcessApplicationStack';

const app = new cdk.App();
Tags.of(app).add('app', 'blog-step-functions-cdk');

const processApplicationStack = new ProcessApplicationStack(app, 'ProcessApplicationStack');
Tags.of(processApplicationStack).add('stack', 'ProcessApplication');
