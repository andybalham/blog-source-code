In [Part 1](https://www.10printiamcool.com/designing-a-cdk-state-machine-builder-part-1) of this series, I went through my process of designing an alternative API for defining state machines using [CDK](https://aws.amazon.com/cdk/). In this part, I document my trials and tribulations of implementing that API.

All the code for this post can be found in this [GitHub repo](https://github.com/andybalham/blog-source-code/tree/master/api-design-part-2).

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
  // TODO: Recursively call getStepChain
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

The `getPerformStepChain` method is the place where the real work was to be done. I.e., the place where the states would be wired together to build the state machine. The logic I had in mind was as follows.

- Get the state for the current step
- If there is a next step:
  - Invoke the `next` method on the current step state, passing in the chain for the next step
- Else
  - Return the current step state

This was implemented as below.

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

With this, I could replace the references to `State` and the problem with `next` went away. When I re-ran the unit test, all was good. We now had an alternative way of defining state machines in CDK. The only caveat being, they can only consist of a sequence of states. Good, but not that useful, so the next thing to look at was implementing choices.

In [Part 1](https://www.10printiamcool.com/designing-a-cdk-state-machine-builder-part-1), we designed the API to define a choice as follows.

```TypeScript
.choice('Choice1', {
  choices: [{ when: sfn.Condition.booleanEquals('$.var1', true), next: 'Choice2' }],
  otherwise: 'Choice3',
})
```

As with `perform`, we need to capture these details in the `choices` method. To do this, I extended the `StepType` enumeration, created a `ChoiceStep` class, and amended the `choice` method to store a `ChoiceStep` instance containing the captured values.

```TypeScript
enum StepType {
  // Snip
  Choice = 'Choice',
}

class ChoiceStep implements BuilderStep {
  //
  constructor(public id: string, public props: BuilderChoiceProps) {
    this.type = StepType.Choice;
  }

  type: StepType;
}

export default class StateMachineBuilder {
  // Snip

  choice(id: string, props: BuilderChoiceProps): StateMachineBuilder {
    this.steps.push(new ChoiceStep(id, props));
    return this;
  }
}
```

With this in place, I could extend the `getStepChain` method to handle the `Choice` step type and call a new `getChoiceStepChain` method.

```TypeScript
switch (step.type) {
  // Snip
  
  case StepType.Choice:
    stepChain = this.getChoiceStepChain(scope, stepIndex);
    break;
```
The implementation of the `getChoiceStepChain` required a slightly different approach, as it needed to instantiate the `State` as well as invoking the appropriate methods on it. It was for this reason that we added the `scope` parameter to the `build` method.

To build the resulting `Choice` state, I needed to invoke the `when` and `otherwise` methods with `IChainable` values. However, the `choices` method only captures the string `id` values. The solution was straightforward and was to create a `getStepIndexById` method to covert one to the other. I went with a simple linear lookup for now, but if performance was paramount, then a indexed lookup could be implemented. 

```TypeScript
private getStepIndexById(id: string): number {
  //
  const stepIndex = this.steps.findIndex((s) => s.id === id);

  if (stepIndex === -1) {
    throw new Error(`Could not find index for id: ${id}`);
  }

  return stepIndex;
}

private getChoiceStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
  //
  const step = this.steps[stepIndex] as ChoiceStep;

  const stepChain = new sfn.Choice(scope, step.id, step.props);

  step.props.choices.forEach((choice) => {
    const nextStepIndex = this.getStepIndexById(choice.next);
    const nextStepChain = this.getStepChain(scope, nextStepIndex);
    stepChain.when(choice.when, nextStepChain);
  });

  const otherwiseStepIndex = this.getStepIndexById(step.props.otherwise);
  const otherwiseStepChain = this.getStepChain(scope, otherwiseStepIndex);
  stepChain.otherwise(otherwiseStepChain);

  return stepChain;
}
```

In the `getStepIndexById` method, I made sure to shout loudly and clearly when the the `id` could not be found. In my experience, you will thank yourself if you throw informative errors when an unhandled value is encountered.

We were nearly there, but there was still one more piece of the `choices` puzzle. To separate the various end states of the state machine, we have calls to the `end` method as follows.

```TypeScript
.perform(state1)
.end()

.perform(state2)
.end()
```

Our intention here was to tell the `build` method to stop recursing and so make the previous state an 'end' state. To do this, I needed to create a new `BuilderStep` and amend the `end` method to add an instance to steps captured.

```TypeScript
enum StepType {
  // Snip
  End = 'End',
}

class EndStep implements BuilderStep {
  //
  constructor() {
    this.type = StepType.End;
  }

  id: string;

  type: StepType;
}

export default class StateMachineBuilder {
  // Snip

  end(): StateMachineBuilder {
    this.steps.push(new EndStep());
    return this;
  }
}
```

In `getPerformStepChain` we had a test for whether we should continue and recursively add a 'next' state. This test relied on the last state being the last state in the `steps` array. With the existence of the `end` states, this assumption was no longer true. To cater for this, I extended the test to check ahead for an 'end' state created and encapsulated the test in a `hasNextStep` method.

```TypeScript

export default class StateMachineBuilder {
  // Snip

  private hasNextStep(stepIndex: number): boolean {
    //
    const isLastStep = stepIndex === this.steps.length - 1;
    const isNextStepEnd = !isLastStep && this.steps[stepIndex + 1].type === StepType.End;
    const hasNextStep = !(isLastStep || isNextStepEnd);

    return hasNextStep;
  }

  private getPerformStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    // Snip

    const stepChain = this.hasNextStep(stepIndex)
      ? stepState.next(this.getStepChain(scope, stepIndex + 1))
      : stepState;

    return stepChain;
  }
}
```

With this in place, I re-ran the unit tests and was met with unalloyed success. In the next part, I look to implement the `map` and `parallel` methods, and to implement functionality to add error handlers too.

