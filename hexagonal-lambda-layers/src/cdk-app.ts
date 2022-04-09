/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import ApplicationStack from './ApplicationStack';
import DataStorage from './DataStorageStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'HexagonalLambdaLayersApp');

new DataStorage(app, 'DataStorageStack', {});
new ApplicationStack(app, 'ApplicationStack', {});
