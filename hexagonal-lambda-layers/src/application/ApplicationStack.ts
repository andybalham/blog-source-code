/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-new */
/* eslint-disable import/no-extraneous-dependencies */
import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import CustomerUpdatedHandler from './CustomerUpdatedHandler';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApplicationStackProps {
  // TODO 08Apr22: Do we need to pass anything in here?
}

export default class ApplicationStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ApplicationStackProps) {
    super(scope, id);

    const customerUpdatedTopic = new sns.Topic(this, 'CustomerUpdatedTopic');

    new CustomerUpdatedHandler(this, 'CustomerUpdatedHandler', {
      customerUpdatedTopic,
      customerTableName: 'TODO: Get from SSM parameter',
      accountDetailTableName: 'TODO: Get from SSM parameter',
    });
  }
}
