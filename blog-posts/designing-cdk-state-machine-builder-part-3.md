In my [previous post](https://www.10printiamcool.com/designing-a-cdk-state-machine-builder-part-2), I started to implement my alternative API for defining state machines in CDK. In this post, I continue this and, after a few bumps in the road, get a usable version finished and tested.

The code for this post can be found in the GitHub repo [here](https://github.com/andybalham/blog-source-code/tree/master/api-design-part-2).

As we left in in [Part 2](https://www.10printiamcool.com/designing-a-cdk-state-machine-builder-part-2), we still had the following functionality to implement.

* Map states
* Parallel states
* Error handlers

Unbeknownst to me at this point, there would also be other challenges when I started to consider some of the more involved state machine scenarios.

If you recall, in our design, `Map` states are defined as follows.

```TypeScript
.map('Map1', {
  itemsPath: '$.Items1',
  iterator: new StateMachineBuilder()
    .perform(state1)
    .perform(state2)
    .perform(state3)
    .perform(state4),
})
```

With `Parallel` states defined like this.

```TypeScript
.parallel('Parallel2', {
  branches: [
    new StateMachineBuilder().perform(state5).perform(state6),
    new StateMachineBuilder().perform(state7).perform(state8),
  ],
})
```

In both cases, the idea is that the 'sub-states' are built by defining separate `StateMachineBuilder` instances. When `build` is called, we should be able to call `build` on the 'sub-states' and obtain an appropriate `IChainable` instance.

As with the `perform` and `choices` steps in [Part 2](https://www.10printiamcool.com/designing-a-cdk-state-machine-builder-part-2), I needed new `BuilderStep` classes to capture and hold the details of the states to create.

```TypeScript
class MapStep implements BuilderStep {
  // Snip
}

class ParallelStep implements BuilderStep {
  // Snip
}
```

With these in place, I could amend the following methods to store the steps for later use by the `build` method.

```TypeScript
map(id: string, props: BuilderMapProps): StateMachineBuilder {
  this.steps.push(new MapStep(id, props));
  return this;
}

parallel(id: string, props: BuilderParallelProps): StateMachineBuilder {
  this.steps.push(new ParallelStep(id, props));
  return this;
}
```

With the new step types being added, I needed to extend the `switch` in `getStepChain` to call new methods that return an appropriate `IChainable` instance.

```TypeScript
case StepType.Map:
  stepChain = this.getMapStepChain(scope, stepIndex);
  break;

case StepType.Parallel:
  stepChain = this.getParallelStepChain(scope, stepIndex);
  break;
```

Implementing `getMapStepChain` and `getParallelStepChain` required a very similar approach. In both cases, the `build` method is called on TODO

* Create the state
* Create the sub-state by invoking `build` with the `scope`
* Add the sub-state to the current state
* Wire up the next state, if there is one

The difference between the two being that the `Parallel` state can have multiple sub-states.

```TypeScript
private getMapStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
  //
  const step = this.steps[stepIndex] as MapStep;

  const map = new sfn.Map(scope, step.id, step.props);

  map.iterator(step.props.iterator.build(scope));

  const stepChain = this.hasNextStep(stepIndex)
    ? map.next(this.getStepChain(scope, stepIndex + 1)) 
    : map;

  return stepChain;
}

private getParallelStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
  //
  const step = this.steps[stepIndex] as ParallelStep;

  const parallel = new sfn.Parallel(scope, step.id, step.props);

  step.props.branches.forEach((branch) => {
    parallel.branch(branch.build(scope));
  });

  const stepChain = this.hasNextStep(stepIndex)
    ? parallel.next(this.getStepChain(scope, stepIndex + 1))
    : parallel;

  return stepChain;
}
```

Using the examples created in [Part 1](https://www.10printiamcool.com/designing-a-cdk-state-machine-builder-part-1) and the testing approach in [Part 2](https://www.10printiamcool.com/designing-a-cdk-state-machine-builder-part-2), I was able to verify that `StateMachineBuilder`was behaving as expected and outputting the equivalent definition.

The final part in the puzzle, or so I thought, was to implement error handlers. The API design for defining these was for a `catches` array on the appropriate `props` passed in to each method, an example of which is shown below.

```TypeScript
.perform(function1, {
  catches: [
    { errors: ['States.Timeout'], handler: 'Catch1' },
    { errors: ['States.All'], handler: 'Catch2' },
  ],
})
.map('Map1', {
  itemsPath: '$.Items1',
  iterator: new StateMachineBuilder().perform(state1).perform(state2),
  catches: [{ handler: 'Catch5' }],
})
.parallel('Parallel1', {
  branches: [
    new StateMachineBuilder().perform(state3),
    new StateMachineBuilder().perform(state4),
  ],
  catches: [{ handler: 'Catch6' }],
})
```

All looking pretty straightforward I thought, all I needed to do was iterate over the `catches` and invoke the `addCatch` method with with the `IChainable` for the handler state.

```TypeScript
private getPerformStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
  //
  const step = this.steps[stepIndex] as PerformStep;

  const stepState = (step as PerformStep).state;

  step.props.catches.forEach((catchProps) => {
    const handlerStepIndex = this.getStepIndexById(catchProps.handler);
    const handlerChainable = this.getStepChain(scope, handlerStepIndex);
    stepState.addCatch(handlerChainable, catchProps);
  });

  const stepChain = this.hasNextStep(stepIndex)
    ? stepState.next(this.getStepChain(scope, stepIndex + 1))
    : stepState;

  return stepChain;
}
```
However, there was one snag as shown below.

```
Property 'addCatch' does not exist on type 'INextableState'. Did you mean '_addCatch'?
```

It turned out that `addCatch` is only on `TaskStateBase`. My solution was to remove `PerformProps` from the `perform` method and rename it to `TryPerformProps`. I then created a new method called `tryPerform` that takes a `TaskStateBase` instead.

```TypeScript
tryPerform(state: sfn.TaskStateBase, props: BuilderTryPerformProps): StateMachineBuilder {
  this.steps.push(new TryPerformStep(state, props));
  return this;
}
```

I could then use my original approach for a new `getTryPerformStepChain` method, and was able to call the `addCatch` method as intended. The same pattern could then be repeated for `map` and `parallel`, but taking into account the fact that the catches are optional in these cases.

```TypeScript
export default class StateMachineBuilder {
  // Snip

  private getMapStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    // Snip

    if (step.props?.catches) {
      step.props.catches.forEach((catchProps) => {
        const handlerStepIndex = this.getStepIndexById(catchProps.handler);
        const handlerChainable = this.getStepChain(scope, handlerStepIndex);
        map.addCatch(handlerChainable, catchProps);
      });
    }

    // Snip
  }

  private getParallelStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    // Snip

    if (step.props?.catches) {
      step.props.catches.forEach((catchProps) => {
        const handlerStepIndex = this.getStepIndexById(catchProps.handler);
        const handlerChainable = this.getStepChain(scope, handlerStepIndex);
        parallel.addCatch(handlerChainable, catchProps);
      });
    }

    // Snip
  }
}
```

All was looking promising, but running the unit tests resulted in the following failure.

```
+ expected - actual

         "expressionAttributeValues": {
           "$.Var1.$": "$.Var1"
         }
       }
-      "Resource": "${Token[TOKEN.241]}"
+      "Resource": "${Token[TOKEN.157]}"
       "Type": "Task"
     }
```

As far as I understand it, the issue here is down to the way that CDK generates placeholders in the definition to link to resources later on. For our purposes, we do not care what resource this will point to. Given this, I wrote the following method to replace all token references with a generic value.

```TypeScript
function getComparableGraph(builderStateMachine: StateMachineWithGraph) {
  const graphJson = builderStateMachine.graphJson;
  const comparableGraphJson = graphJson.replace(/\[TOKEN\.[0-9]+\]/g, '[TOKEN.n]');
  return JSON.parse(comparableGraphJson);
}
```

In the unit tests, I amended to comparison to use the new method to compare the results.

```TypeScript
expect(getComparableGraph(builderStateMachine)).to.deep.equal(
  getComparableGraph(cdkStateMachine)
);
```

With this changes, all the unit tests were passing and I felt pretty good. However, I thought about other state machine scenarios and, in particular, the scenario where there is a common downstream state as shown below.

TODO: Common state image

This scenario is simple enough to define using our API.

```TypeScript
const definition = new StateMachineBuilder()

  .choice('Choice1', {
    choices: [{ when: sfn.Condition.booleanEquals('$.var1', true), next: 'State2' }],
    otherwise: 'Choice2',
  })

  .choice('Choice2', {
    choices: [{ when: sfn.Condition.booleanEquals('$.var2', true), next: 'State2' }],
    otherwise: 'State1',
  })

  .perform(state1)
  .end()

  .perform(state2)
  .perform(state3)
  .end()
```

However, when testing I got the following error.

```
Error: State 'State2' already has a next state
    at Pass.makeNext (node_modules\@aws-cdk\aws-stepfunctions\lib\states\state.ts:287:13)
    at Pass.next (node_modules\@aws-cdk\aws-stepfunctions\lib\states\pass.ts:137:11)
    at StateMachineBuilder.getPerformStepChain (src\constructs\StateMachineBuilder-v1.ts:196:19)
    at StateMachineBuilder.getStepChain (src\constructs\StateMachineBuilder-v1.ts:163:26)
```

Thinking about it, this made sense. The code would have already traversed one path to `State2` through a branch of `Choice1` and invoked the `next` method. Given this, my thought was to cache the `IChainable` values for all visited steps. We could then return the cached instance and avoid multiple calls to `next`.

TODO Solution:

```TypeScript
export default class StateMachineBuilder {
  // Snip

  private readonly stepChainByIndex = new Map<number, sfn.IChainable>();

  // Snip

  private getStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const visitedStepChain = this.stepChainByIndex.get(stepIndex);

    if (visitedStepChain !== undefined) {
      return visitedStepChain;
    }

    // Snip

    this.stepChainByIndex.set(stepIndex, stepChain);

    return stepChain;
  }

  // Snip
}
```

TODO Success! But what about loops?

TODO: Loops image

```TypeScript
const definition = new StateMachineBuilder()

  .perform(state1)

  .choice('Choice1', {
    choices: [{ when: sfn.Condition.booleanEquals('$.var1', true), next: 'State1' }],
    otherwise: 'State2',
  })

  .perform(state2)
```

TODO But we get the error:

```
Error: There is already a Construct with name 'Choice1' in Stack [BackwardsLoop-Builder]
    at Node.addChild (node_modules\constructs\src\construct.ts:534:13)
    ...snip...
    at new Choice (node_modules\@aws-cdk\aws-stepfunctions\lib\states\choice.ts:50:5)
    at StateMachineBuilder.getChoiceStepChain (src\constructs\StateMachineBuilder-v2.ts:258:23)
    at StateMachineBuilder.getStepChain (src\constructs\StateMachineBuilder-v2.ts:180:26)
```

TODO: The solution was to look at the CDK version:

```TypeScript
const definition = sfn.Chain.start(
  state1.next(
    new sfn.Choice(definitionScope, 'Choice1')
      .when(sfn.Condition.booleanEquals('$.var1', true), state1)
      .otherwise(state2)
  )
);
```

Here, the `when` is being invoked on the `Choice` __before__ the `next` is invoked on `state1`. In `StateMachineBuilder`, the `when` was being invoked __after__ the `next`. The underlying code must be traversing the `next` link and trying to add `Choice1` state for a second time.

The solution was store the `State` instances in a lookup, before recursively calling `getStepChain`. With this lookup in place, the `getStepChain` method could resolve a step to a visited state, but before it had been wired up to any others.

```TypeScript
export default class StateMachineBuilder {
  // Snip

  private readonly stepStateByIndex = new Map<number, sfn.State>();

  private getStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const visitedStepState = this.stepStateByIndex.get(stepIndex);

    if (visitedStepState !== undefined) {
      return visitedStepState;
    }

    // Snip
  }

  private getPerformStepChain(scope: cdk.Construct, stepIndex: number): sfn.IChainable {
    //
    const step = this.steps[stepIndex] as PerformStep;

    const stepState = (step as PerformStep).state;

    this.stepStateByIndex.set(stepIndex, stepState);

    const stepChain = this.hasNextStep(stepIndex)
      ? stepState.next(this.getStepChain(scope, stepIndex + 1))
      : stepState;

    return stepChain;
  }

  // Snip
}
```