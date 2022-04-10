/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataAccessStackProps {
  // TODO 08Apr22: Do we need to pass anything in here?
}

export default class DataAccessStack extends cdk.Stack {
  //
  static readonly LAYER_ARN_SSM_PARAMETER = '/layer-arn/data-access';

  constructor(scope: cdk.Construct, id: string, props: DataAccessStackProps) {
    super(scope, id);

    const layer = new lambda.LayerVersion(this, 'DataAccessLayer', {
      compatibleRuntimes: [lambda.Runtime.NODEJS_12_X, lambda.Runtime.NODEJS_14_X],
      code: lambda.Code.fromAsset('src/data-access'),
      description: 'Provides data access clients',
    });

    // TODO 10Apr22: Make the layer a construct that updates the SSM parameter?

    new cdk.CfnOutput(this, 'DataAccessLayerArn', {
      value: layer.layerVersionArn,
    });
  }
}
