#!/usr/bin/env node
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { TheSagaStepfunctionSingleTableStack } from '../lib/the-saga-stepfunction-single-table-stack';

const app = new cdk.App();
new TheSagaStepfunctionSingleTableStack(app, 'TheSagaStepfunctionSingleTableStack');
