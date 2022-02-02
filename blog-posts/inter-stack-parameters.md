What do you do, when you have one stack that depends on a deployment details from another? Here we look at how we can use the [AWS Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) and [CDK](https://aws.amazon.com/cdk/) provide a solution to this problem.

## TL;DR

- One stack creates a parameter in the Parameter Store
- Another stack accesses the parameter, either at deployment or runtime

## The problem

In preparation for an upcoming blog post, I wanted to create a set of mock API endpoints in one stack and then have a set of Lambda functions to call them from a separate stack.

To do this, each Lambda function would need to know the base URL of the corresponding API endpoint, which could change on each deployment of the API stack.

I also wanted to avoid having to deploy the Lambda function stack each time I deployed the mock API stack.

## The plan

AWS describes the [Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) as follows:

> Parameter Store, a capability of AWS Systems Manager, provides secure, hierarchical storage for configuration data management and secrets management.

Values within the Parameter Store are accessed via keys, which are just string values.

Given this, it struck me that if both stacks have shared knowledge of a statically-defined key string, then they should be able to use this key to share dynamically-generated values. One stack storing the value and the other retrieving it.

## The Mock API stack

The first thing for me to do was create a stack that contained a mock API. In this case, it was to be a mock Credit Reference service. As the parameter name is to be shared across stacks, we set up the stack so that it can be passed in via a properties object.

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

The next step was to do was define the `HttpApi` and a parameter that contains the deployment time value of the corresponding `url` property.

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

I have omitted the Lambda integration here, the full code for the stack can found on my [GitHub repo](https://github.com/andybalham/blog-source-code/tree/master/passing-parameters).

To deploy the stack, I created the following cdk `app`:

```TypeScript
const app = new cdk.App();

const creditReferenceUrlParameterName = '/mock-apis/credit-reference-api/base-url';

new MockApiStack(app, 'MockApiStack', { creditReferenceUrlParameterName });
```

When the stack was deployed the stack to AWS, I went into the AWS Console and confirmed that the parameter had been created as expected.

![aws-console-parameter-store.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1643445260606/LG3eQb9Zx.png)

## The Lambda stack

The next step was to create the stack that would contain the Lambda functions that call the mock APIs. As with the mock API stack, this took a properties object to allow the name of the parameter to be passed in.

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

My first thought was to pass the mock API URL in as an environment variable to the calling function. The question was how to obtain the value to pass in. The answer was to use the [`fromStringParameterName`](https://docs.aws.amazon.com/cdk/api/v1/dotnet/api/Amazon.CDK.AWS.SSM.StringParameter.html#Amazon_CDK_AWS_SSM_StringParameter_FromStringParameterName_Constructs_Construct_System_String_System_String_) method on the [`StringParameter`](https://docs.aws.amazon.com/cdk/api/v1/dotnet/api/Amazon.CDK.AWS.SSM.StringParameter.html) class.

```TypeScript
const creditReferenceApiUrlParameter = ssm.StringParameter.fromStringParameterName(
  this,
  'CreditReferenceApiUrlParameter',
  props.creditReferenceUrlParameterName
);

this.creditReferenceProxyFunction = new lambdaNodejs.NodejsFunction(
  this,
  'CreditReferenceProxyFunction',
  {
    environment: {
      CREDIT_REFERENCE_URL: creditReferenceApiUrlParameter.stringValue,
    },
  }
);
```

The code for the Lambda function was straightforward, using the [Axios](https://www.npmjs.com/package/axios) npm package to make the call.

```TypeScript
export const handler = async (event: any): Promise<any> => {
  const creditReferenceUrl = process.env['CREDIT_REFERENCE_URL'];

  console.log(JSON.stringify({ creditReferenceUrl }, null, 2));

  if (creditReferenceUrl === undefined) 
    throw new Error('creditReferenceUrl === undefined');

  const request: CreditReferenceRequest = {
    firstName: 'Trevor',
    lastName: 'Potato',
    postcode: 'MK3 9SE',
  };

  try {
    const res = await axios.post(`${creditReferenceUrl}request`, request);
    console.log(res.data);
  } catch (err) {
    console.error(err);
  }
};
```

To deploy the stack, I added it to the CDK `app` and passed in the common parameter name.

```TypeScript
const app = new cdk.App();

const creditReferenceUrlParameterName = '/mock-apis/credit-reference-api/base-url';

new MockApiStack(app, 'MockApiStack', { creditReferenceUrlParameterName });
new LoanProcessorTestStack(app, 'LoanProcessorTestStack', { creditReferenceUrlParameterName });
```

Once deployed, I checked the Lambda function environment variables and confirmed that the value was being passed in.

![environment-variables.png](https://cdn.hashnode.com/res/hashnode/image/upload/v1643446480168/6MGl2jDZJ.png)

A quick test through the AWS Console confirmed that the function was working as expected:

```text
2022-01-29T09:08:24.808Z	10179872-38a0-4687-a8b4-382b814696cf	INFO	{
  "creditReferenceUrl": "https://o8z7mzryt0.execute-api.eu-west-2.amazonaws.com/"
}
2022-01-29T09:08:24.964Z	10179872-38a0-4687-a8b4-382b814696cf	INFO	{ reference: 'CR1234', rating: 'Ugly' }
```

## Decoupling the stacks

One drawback with the approach taken so far was that if a deployment of the mock API caused the URLs to change, then the Lambda stack would also need to be deployed to pick up the new values. Could we decouple this dependency by resolving the URLs at runtime rather than deployment time?

The solution was to pass in the name of the parameter as an environment variable, rather than the value. Then the Lambda function could use the [AWS SDK](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-started-nodejs.html) to look up the value directly from the Parameter Store.

First I updated the stack so that the parameter name was passed to the Lambda function as an environment variable. I then added a call to `grantRead` on the parameter, so that the Lambda function would have access to the parameter. Without this, we would get an 'access denied' error at runtime.

```TypeScript
this.creditReferenceProxyFunction = new lambdaNodejs.NodejsFunction(
  this,
  'CreditReferenceProxyFunction',
  {
    environment: {
      CREDIT_REFERENCE_URL_PARAMETER_NAME: props.creditReferenceUrlParameterName,
    },
  }
);

creditReferenceApiUrlParameter.grantRead(this.creditReferenceProxyFunction);
```

With the stack updated, I turned my attention to the Lambda function and added code to use the new environment variable to get the parameter from the Parameter Store.

```TypeScript
const ssm = new AWS.SSM();

const creditReferenceUrlParameterName =
  process.env[CREDIT_REFERENCE_URL_PARAMETER_NAME_ENV_VAR];

if (creditReferenceUrlParameterName === undefined)
  throw new Error('creditReferenceUrlParameterName === undefined');

const creditReferenceUrlParameter = await ssm
  .getParameter({
    Name: creditReferenceUrlParameterName,
    WithDecryption: true,
  })
  .promise();

const creditReferenceUrl = creditReferenceUrlParameter.Parameter?.Value;
```

To test the changes, I first redeployed the Lambda stack. I then destroyed the mock API stack and redeployed it, before testing the Lambda function again. The result was that the URL was successfully retrieved at runtime.

```text
2022-01-29T16:28:15.864Z	febe6e31-5cfd-43bb-8fcf-4febd062c247	INFO	{
  "creditReferenceUrl": "https://ec7smjoixe.execute-api.eu-west-2.amazonaws.com/"
}
2022-01-29T16:28:16.344Z	febe6e31-5cfd-43bb-8fcf-4febd062c247	INFO	{ reference: 'CR1234', rating: 'Ugly' }
```

## Do as say, not as I do

The approach described above was perfectly adequate for example code for a blog post. However, I would not suggest such an approach for production code.

The first thing is that the following code should be outside the Lambda handler method. It is not necessary to initialise this on each call and there is an overhead to do so.

```TypeScript
const ssm = new AWS.SSM();
```

The second thing is that there is both an overhead and a limit to accessing the Parameter Store. As this excellent [article](https://medium.com/claranet-italia/a-practical-guide-to-surviving-aws-sam-d8ab141b3d25) on parameters and stacks points out:

> A way could be to retrieve parameters directly from code using the AWS SDK, but I’ll encourage you to take a look at [lambda power tools](https://github.com/awslabs/aws-lambda-powertools-python) or [ssm cache](https://github.com/alexcasalboni/ssm-cache-python) that expose also the capability to cache parameters. Pay attention to the fact that Parameter Store API has a default throughput limit of 40 transactions per second. This limit can be increased up to 1000 transactions per second but you will incur additional costs.

One solution to this would be to cache the value outside the handler function and refresh it if the call to the endpoint receives a `404` response. This exercise is left for the reader 😉

Another option here to consider is the [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/). For a comparison of the two services, see this article on [AWS Parameter Store vs. AWS Secrets Manager](https://www.1strategy.com/blog/2019/02/28/aws-parameter-store-vs-aws-secrets-manager/). If you are using the excellent [middy](https://middy.js.org/) middleware, then you can use the [SSM middleware](https://middy.js.org/packages/ssm/) package.

## Summary

We can use the AWS Parameter Store to share information between stacks. This information can be provided at deployment time or, with some consideration, at runtime.
