* Mention previous post
* Mention remaining implementations
* Mention tricky scenarios
* Mention repo

`Map` states are defined as follows.

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

With `Parallel` states like this.

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

With these in place, I could amend the following methods to store the steps for later.

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

TODO `getStepChain`

```TypeScript
case StepType.Map:
  stepChain = this.getMapStepChain(scope, stepIndex);
  break;

case StepType.Parallel:
  stepChain = this.getParallelStepChain(scope, stepIndex);
  break;
```

TODO Talk about the similarity in approach, invoking `build` on the sub-states and passing in the `scope`.

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

TODO: Catches

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

TODO Created `PerformProps`:

```TypeScript
interface BuilderPerformProps {
  catches: BuilderCatchProps[];
}

export default class StateMachineBuilder {
  // Snip

  tryPerform(state: INextableState, props: BuilderPerformProps): StateMachineBuilder {
    this.steps.push(new PerformStep(state, props));
    return this;
  }
}
```

TODO: No `addCatch` on INextable

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

The problem being:

```
Property 'addCatch' does not exist on type 'INextableState'. Did you mean '_addCatch'?
```

TODO Solution to create a new method `tryPerform` that takes `TryPerformProps` a `TaskStateBase` and adds a `TryPerformStep`.

```TypeScript
tryPerform(state: sfn.TaskStateBase, props: BuilderTryPerformProps): StateMachineBuilder {
  this.steps.push(new TryPerformStep(state, props));
  return this;
}
```

The pattern could then be repeated for `map` and `parallel`, but taking into account optionality.

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

Running the unit tests comparing the output TODO

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

TODO Created `getComparableGraph`

```TypeScript
function getComparableGraph(builderStateMachine: StateMachineWithGraph) {
  const graphJson = builderStateMachine.graphJson;
  const comparableGraphJson = graphJson.replace(/\[TOKEN\.[0-9]+\]/g, '[TOKEN.n]');
  return JSON.parse(comparableGraphJson);
}
```

Now we can compare with generic placeholder values:

```TypeScript
expect(getComparableGraph(builderStateMachine)).to.deep.equal(
  getComparableGraph(cdkStateMachine)
);
```

TODO: Common states

TODO: Common state image

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

We get the following error.

```
Error: State 'State2' already has a next state
    at Pass.makeNext (node_modules\@aws-cdk\aws-stepfunctions\lib\states\state.ts:287:13)
    at Pass.next (node_modules\@aws-cdk\aws-stepfunctions\lib\states\pass.ts:137:11)
    at StateMachineBuilder.getPerformStepChain (src\constructs\StateMachineBuilder-v1.ts:196:19)
    at StateMachineBuilder.getStepChain (src\constructs\StateMachineBuilder-v1.ts:163:26)
```

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

The `when` is being invoked on the `Choice` __before__ the `next`