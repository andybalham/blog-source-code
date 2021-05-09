In [Part 1](https://www.10printiamcool.com/designing-a-cdk-state-machine-builder-part-1) of this series, I went through my process of designing an alternative API for defining state machines using [CDK](https://aws.amazon.com/cdk/). In this part, I document my trials and tribulations of implementing that API.

One question I always ask myself before writing any code is how am I going to test it. That is, how can I have any confidence that the code is running as I expect? I might not take a full-blown [Test-driven development (TDD)](https://en.wikipedia.org/wiki/Test-driven_development) approach, but I need to have some sort of plan of how I am going to execute the code and verify the results. Ideally, this plan involves a straightforward way to both create and repeat those tests.

In [Part 1](https://www.10printiamcool.com/designing-a-cdk-state-machine-builder-part-1), I created a set of examples covering different aspects of defining state machines using CDK. In [Visualising a CDK State Machine using a custom Construct](https://www.10printiamcool.com/visualising-a-cdk-state-machine-using-a-custom-construct), I created a custom construct that outputs the graph JSON for such definitions. It seemed logical to me to combine the two; use the examples as test cases and compare the graph objects from the two implementations to verify. The result is shown below.

```TypeScript
it('renders simple chain', async () => {
  //
  const cdkStateMachine = new StateMachineWithGraph(new cdk.Stack(), 'SimpleChain-CDK', {
    getDefinition: (definitionScope): sfn.IChainable => {
      //
      const state1 = new sfn.Pass(definitionScope, 'State1');
      // Define other states...

      const definition = sfn.Chain.start(
        state1.next(state2.next(state3.next(state4.next(state5.next(state6)))))
      );

      return definition;
    },
  });

  const builderStateMachine = new StateMachineWithGraph(new cdk.Stack(), 'SimpleChain-Builder', {
    getDefinition: (definitionScope): sfn.IChainable => {
      //
      const state1 = new sfn.Pass(definitionScope, 'State1');
      // Define other states...

      const definition = new StateMachineBuilder()
        .perform(state1)
        // Perform other states...
        .build(definitionScope);

      return definition;
    },
  });

  const cdkGraph = JSON.parse(cdkStateMachine.graphJson);
  const builderGraph = JSON.parse(builderStateMachine.graphJson);

  expect(builderGraph).to.deep.equal(cdkGraph);
});
```

Running this test resulted in the following expected, but informative, failure.

```
AssertionError: expected { Object (StartAt, States) } to deeply equal { Object (StartAt, States) }
    at ... <snip>

+ expected - actual

 {
-  "StartAt": "TODO"
+  "StartAt": "State1"
   "States": {
-    "TODO": {
+    "State1": {
+      "Next": "State2"
+      "Type": "Pass"
+    }
```

With my testing strategy in place, I turned my attention to getting the test to pass.

The first method to implement was `perform`, where we supply a state to be added to the definition when we call the `build` method. To do this, we need to capture the details for the `build` method to use. I knew we would need to capture details for other methods, such as `choice`, so I created a an interface and class to capture these. As TypeScript doesn't have a true type system, I included a `type` enumeration to make introspection easy at runtime.

```TypeScript
enum StepType {
  Perform = 'Perform',
  TryPerform = 'TryPerform',
  Choice = 'Choice',
  End = 'End',
  Map = 'Map',
  Parallel = 'Parallel',
}

interface BuilderStep {
  type: StepType;
  id: string;
}

class PerformStep implements BuilderStep {
  //
  constructor(public state: sfn.State) {
    this.type = StepType.Perform;
    this.id = state.id;
  }

  type: StepType;

  id: string;
}
```

With this in place, I added a class-level array to `StateMachineBuilder` to hold the steps and updated the `perform` method to capture the details to perform.

```TypeScript
private readonly steps = new Array<BuilderStep>();

perform(state: sfn.State): StateMachineBuilder {
  this.steps.push(new PerformStep(state));
  return this;
}
```

With this in place, I started to look at the `build` method and how we could use these details to build a CDK state machine definition. The `build` method takes a scope parameter and returns an instance that implements `IChainable`. In my mind, I could see that we would need to recurse through the steps to replicate the CDK approach. It seemed logical to me that the `build` method should just initiate the recursion by returning the `IChainable` for the first step. The `getStepChain` method would then recursively call itself to build the structure.

```TypeScript
build(scope: cdk.Construct): sfn.IChainable {
  return this.getStepChain(scope, 0);
}

private getStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
  // TODO
}
```

I could see that the `getStepChain` method would need to handle the various step types, so I added a `switch` and deferred the processing to a specific handler method.

```TypeScript
private getStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
  //
  const step = this.steps[stepIndex];

  let stepChain: sfn.IChainable;

  switch (step.type) {
    //
    case StepType.Perform:
      stepChain = this.getPerformStepChain(scope, stepIndex);
      break;

    default:
      throw new Error(`Unhandled step type: ${JSON.stringify(step)}`);
  }

  return stepChain;
}
```

The `getPerformStepChain` method is the place where the real work was to be done. I.e., the place where the states would be wired together to build the state machine.

- Get the state for the current step
- If there is a next step:
  - Invoke the `next` method on the current step state, passing in the chain for the next step
- Else
  - Return the current step state

```TypeScript
private getPerformStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
  //
  const step = this.steps[stepIndex] as PerformStep;

  const stepState = (step as PerformStep).state;

  const stepChain = stepIndex < this.steps.length - 1
    ? stepState.next(this.getStepChain(scope, stepIndex + 1))
    : stepState;

  return stepChain;
}
```

All looked fine, but there was a problem. I could see the following error.

```
Property 'next' does not exist on type 'State'. Did you mean '_next'?
```

I had assumed that the `State` class had a `next` method. However, by looking at the definition for the `Pass` state, I could see the following.

```TypeScript
export declare class Pass extends State implements INextable
```

It turned out that the `next` method lives on a separate interface. What I wanted was something that encapsulated a `State` with a `next` method, so I created my own `INextableState` interface.

```TypeScript
interface INextableState extends sfn.State, sfn.INextable {}
```

With this, I could replace the references to `State` and the problem with `next` went away. When I re-ran the unit test, all was good. We now had an alternative way of defining state machines in CDK. The only caveat being, they can only consist of a sequence of states. Not that useful, the next thing to look at was implementing choices.
