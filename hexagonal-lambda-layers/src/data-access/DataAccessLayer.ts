/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as ssm from '@aws-cdk/aws-ssm';
import path from 'path';

export default class DataAccessLayer extends cdk.Construct {
  //
  static readonly LAYER_ARN_SSM_PARAMETER = '/layer-arn/data-access';

  readonly layer: lambda.ILayerVersion;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.layer = new lambda.LayerVersion(this, 'DataAccessLayer', {
      compatibleRuntimes: [lambda.Runtime.NODEJS_12_X, lambda.Runtime.NODEJS_14_X],
      code: lambda.Code.fromAsset(path.join(__dirname, `/../../dist/src/data-access/layer`)),
      description: 'Provides data access clients',
    });

    new ssm.StringParameter(this, 'DataAccessLayerArnSsmParameter', {
      parameterName: DataAccessLayer.LAYER_ARN_SSM_PARAMETER,
      stringValue: this.layer.layerVersionArn,
      description: 'The ARN of the latest Data Access layer',
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });
  }
}
