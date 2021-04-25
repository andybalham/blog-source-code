# Visualising a CDK State Machine using a custom Construct

[Previously](https://www.10printiamcool.com/converting-an-aws-step-function-to-use-cdk-part-2), I went through the process of converting a JSON-based step function using [SAM](https://aws.amazon.com/serverless/sam/), to a code-based step function using [CDK](https://aws.amazon.com/cdk/). One of the challenges I faced, was visualising the final result. My workaround was to use the [AWS Toolkit](https://aws.amazon.com/visualstudiocode/) to download the deployed definition and render that to a graph. In this post, I go through the process of create a CDK construct that allows us to have the definition generated locally.

Given that CDK works by generating [CloudFormation](https://aws.amazon.com/cloudformation/), it stood to reason that the CDK must have functionality to render the state machine definitions to a format that could be rendered by the AWS Toolkit. A search of the documentation revealed that the [`StateGraph`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-stepfunctions.StateGraph.html) class has a `toGraphJson` method which promises to:

> Return the Amazon States Language JSON for this graph.

All very promising, so armed with this information, I created my first attempt:

```TypeScript
export default class StateMachineWithGraph extends sfn.StateMachine {
  //
  readonly graphJson: string;

  constructor(scope: cdk.Construct, id: string, props: sfn.StateMachineProps) {
    //
    super(scope, id, props);

    const stateGraph = new sfn.StateGraph(
      props.definition.startState,
      'Temporary graph to render to JSON'
    );

    this.graphJson = (stateGraph.toGraphJson() as unknown) as string;
  }
}
```

I had to create a `StateGraph` instance, as I could not see how to access this internal class in the base `StateMachine`. Still, it all looked very plausible. I amended my `Stack` to use the construct (a drop-in replacement) and added a call to a new `writeGraphJson` method to write out the result to a file.

```TypeScript
private static writeGraphJson(stateMachine: StateMachineWithGraph): void {
  //
  const stateMachinePath = path.join(__dirname, 'stateMachines');

  if (!fs.existsSync(stateMachinePath)) fs.mkdirSync(stateMachinePath);

  fs.writeFileSync(
    path.join(stateMachinePath, `${stateMachine.node.id}.asl.json`),
    stateMachine.graphJson
  );
}
```

My hopes were high, so ran `cdk synth` to exercise the code. The result, as often happens in software, was failure:

```Text
Error: Trying to use state 'Pass' in Temporary graph to render to JSON (Pass), but is already in State Machine Test definition (Pass). Every state can only be used in one graph.
```

The problem is, as the error explains, that a state can only be part of a single graph and we are adding our states to multiple ones for the purposes of rendering. My solution, to replace the `definition` property with an instance of the following function that allows the states to be generated multiple times.

```TypeScript
export interface StateMachineWithGraphProps extends Omit<StateMachineProps, 'definition'> {
  getDefinition: (scope: cdk.Construct) => sfn.IChainable;
}
```

Here I am using the [`Omit`](https://mariusschulz.com/blog/the-omit-helper-type-in-typescript) helper type to selectively replace the `definition` property. With this interface, I amended the construct to call the new function twice. 

The first call is with the construct scope, and provides the definition for the base construct. For the second call, we supply a new `Stack` as a separate scope.

```TypeScript
export default class StateMachineWithGraph extends sfn.StateMachine {
  //
  readonly graphJson: string;

  constructor(scope: cdk.Construct, id: string, props: StateMachineWithGraphProps) {
    //
    super(scope, id, {
      ...props,
      definition: props.getDefinition(scope),
    });

    const stateGraph = new sfn.StateGraph(
      props.getDefinition(new cdk.Stack()).startState,
      'Temporary graph to render to JSON'
    );

    this.graphJson = (stateGraph.toGraphJson() as unknown) as string;
  }
}
```

This change did mean a change to the original `Stack`, as we now need to supply a function that generates a definition, rather than definition itself.

```TypeScript
const processApplicationStateMachine = new StateMachineWithGraph(
  this,
  'ProcessApplicationStateMachine',
  {
    getDefinition: (definitionScope): sfn.IChainable =>
      sfn.Chain.start(
        performIdentityChecks
          .next(aggregateIdentityResults)
          .next(
            new sfn.Choice(definitionScope, 'EvaluateIdentityResults')
              .when(overallIdentityResultIsFalse, performDeclineTasks)
              .otherwise(
                performAffordabilityCheck.next(
                  new sfn.Choice(definitionScope, 'EvaluateAffordabilityResult')
                    .when(affordabilityResultIsBad, performDeclineTasks)
                    .when(affordabilityResultIsPoor, performReferTasks)
                    .otherwise(performAcceptTasks)
                )
              )
          )
      ),
  }
);
```

Once more, I tried `cdk synth` and once more found failure:

```Text
Error: SingletonFunction at 'AggregateIdentityResultsExpression/EvalFunction' should be created in the scope of a Stack, but no Stack found
```

I was pretty sure it was being created in the scope of a `Stack`, but it did strike me that it wasn't being created in the same scope as the definition. Given this, I moved it into the definition function.

```TypeScript
const processApplicationStateMachine = new StateMachineWithGraph(
  this,
  'ProcessApplicationStateMachine',
  {
    getDefinition: (definitionScope): sfn.IChainable => {
      //
      const aggregateIdentityResults = new sfnTasks.EvaluateExpression(
        definitionScope,
        'AggregateIdentityResultsExpression',
        {
          expression: '($.identityResults).every((r) => r.success)',
          resultPath: '$.overallIdentityResult',
        }
      );

      return sfn.Chain.start(
        performIdentityChecks
          .next(aggregateIdentityResults)
          ...
```

Success, at least in terms of a new error message:

```Text
Error: State 'PerformIdentityChecks' already has a next state
```

I now kicked myself, as I should have guessed that all the states need to be created in the same scope as the definition. The logical outcome of this was to create a new method that took a scope, created the states, and then returned the definition:

```TypeScript
private getProcessApplicationDefinition(scope: cdk.Construct): sfn.IChainable
```

This resulted in the rather clean result below:

```TypeScript
const processApplicationStateMachine = new StateMachineWithGraph(
  this,
  'ProcessApplicationStateMachine',
  {
    getDefinition: (definitionScope): sfn.IChainable =>
      this.getProcessApplicationDefinition(definitionScope),
  }
);
```

Surely success would be ours now. A quick `cdk synth` revealed that this was not the case:

```Text
TypeError [ERR_INVALID_ARG_TYPE]: The "data" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received an instance of Object
    at Object.writeFileSync (fs.js:1429:5)
```

The reason for this is that, rather annoyingly, the `toGraphJson` method does not actually return JSON. To get the JSON, we need to do the following:

```TypeScript
this.graphJson = JSON.stringify(stateGraph.toGraphJson(), null, 2);
```

A quick spin of `cdk synth` and - lo and behold - we have the following renderable result:

```JSON
{
  "StartAt": "PerformIdentityChecks",
  "States": {
    "PerformIdentityChecks": {
      "Type": "Map",
      "ResultPath": "$.identityResults",
      "Next": "AggregateIdentityResultsExpression",
      "InputPath": "$.application",
      "Iterator": {
        "StartAt": "PerformIdentityCheck",
        "States": {
          "PerformIdentityCheck": {
            "End": true,
            "Retry": [...
```

Now with this construct, we can automatically generate the graph JSON whenever the stack is synthesised or deployed. The code for this post can be found on GitHub [here](https://github.com/andybalham/blog-source-code/tree/master/step-functions-cdk-diagram).

As I mentioned previously, I am not overly keen on the readability of state machine definitions in CDK. Having a visual graph certainly helps in this, but I have a much more radical idea to improve things. That is subject for another post.

