/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import ApplicationStack from './ApplicationStack';
import DataAccessStack from './DataAccessStack';
import DataStorageStack from './DataStorageStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'HexagonalLambdaLayersApp');

new DataStorageStack(app, 'DataStorageStack', {});
new DataAccessStack(app, 'DataAccessStack', {});
new ApplicationStack(app, 'ApplicationStack', {});
