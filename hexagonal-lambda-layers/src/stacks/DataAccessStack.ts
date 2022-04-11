/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import DataAccessLayer from '../data-access/DataAccessLayer';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataAccessStackProps {
  // TODO 08Apr22: Do we need to pass anything in here?
}

export default class DataAccessStack extends cdk.Stack {
  //
  static readonly LAYER_ARN_SSM_PARAMETER = '/layer-arn/data-access';

  constructor(scope: cdk.Construct, id: string, props: DataAccessStackProps) {
    super(scope, id);

    const dataAccessLayer = new DataAccessLayer(this, 'DataAccessLayer');

    new cdk.CfnOutput(this, 'DataAccessLayerArn', {
      value: dataAccessLayer.layer.layerVersionArn,
    });
  }
}
