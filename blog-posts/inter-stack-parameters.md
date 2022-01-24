What do you do, when you have one stack that depends on a deployment

Here we look at how we can use the [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) and [CDK](TODO) to share data between stacks.

## The problem

In preparation for an upcoming blog post, I wanted to create a set of API end points in one stack and then have a set of Lambda functions to call them in a separate stack.

To do this, each Lambda function would need to know the base URL of the API end point, which could change on each deployment of the API stack.

I also wanted to avoid having to deploy the Lambda function stack each time I deployed the API stack.

## The Parameter Store

AWS describes the [Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) as follows:

> Parameter Store, a capability of AWS Systems Manager, provides secure, hierarchical storage for configuration data management and secrets management.

Values within the Parameter Store are accessed via keys, which are just string values as seen below:

TODO: Picture of the Parameter Store

So, if both stacks have shared knowledge of a statically-defined key string, then they should be able to use this key to share dynamically-generated values.

## The stacks

TODO: Mock API stack

```TypeScript
export interface MockApiStackProps {
  creditReferenceUrlParameterName: string;
}

export default class MockApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: MockApiStackProps) {
    super(scope, id);
  }
}
```

TODO: Test stack

```TypeScript
export interface LoanProcessorTestStackProps {
  creditReferenceUrlParameterName: string;
}

export default class LoanProcessorTestStack extends IntegrationTestStack {
  static readonly StackId = 'LoanProcessorTestStack';

  constructor(scope: cdk.Construct, id: string, props: LoanProcessorTestStackProps) {
    super(scope, id, {
      testStackId: LoanProcessorTestStack.StackId,
    });
  }
}
```

TODO:

```TypeScript
const httpApi = new HttpApi(this, 'CreditReferenceHttpApi', {
  description: 'Credit Reference API',
});

new ssm.StringParameter(this, 'CreditReferenceApiUrlParameter', {
  parameterName: props.creditReferenceUrlParameterName,
  stringValue: httpApi.url ?? '<undefined>',
  description: 'The base URL for the credit reference API',
  type: ssm.ParameterType.STRING,
  tier: ssm.ParameterTier.STANDARD,
});
```

TODO: Function first

TODO: Caching strategy

```TypeScript
export const CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR =
  'CREDIT_REFERENCE_URL_PARAMETER_NAME';

const ssm = new AWS.SSM();

export const handler = async (event: any): Promise<any> => {
  const creditReferenceUrlParameterName =
    process.env[CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR] ?? '<undefined>';

  const creditReferenceUrlParameter = await ssm
    .getParameter({
      Name: creditReferenceUrlParameterName,
      WithDecryption: true,
    })
    .promise();

  const creditReferenceUrl = creditReferenceUrlParameter.Parameter?.Value;

  console.log(JSON.stringify({ creditReferenceUrl }, null, 2));
}
```

TODO: Stack

```TypeScript
const creditReferenceApiUrlParameter =
    ssm.StringParameter.fromStringParameterAttributes(
      this,
      'CreditReferenceApiUrlParameter',
      {
        parameterName: props.creditReferenceUrlParameterName,
      }
    );

this.creditReferenceProxyFunction = new lambdaNodejs.NodejsFunction(
  this,
  'CreditReferenceProxyFunction',
  {
    environment: {
      [CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR]:
        props.creditReferenceUrlParameterName,
    },
  }
);

creditReferenceApiUrlParameter.grantRead(this.creditReferenceProxyFunction);
```

TODO:

```TypeScript
const app = new cdk.App();

const creditReferenceUrlParameterName = '/credit-reference-api/base-url';

new MockApiStack(app, 'MockApiStack', { creditReferenceUrlParameterName });
new LoanProcessorTestStack(app, 'LoanProcessorTestStack', { creditReferenceUrlParameterName });
```

https://medium.com/claranet-italia/a-practical-guide-to-surviving-aws-sam-d8ab141b3d25

https://aws.amazon.com/about-aws/whats-new/2019/04/aws_systems_manager_now_supports_use_of_parameter_store_at_higher_api_throughput/
