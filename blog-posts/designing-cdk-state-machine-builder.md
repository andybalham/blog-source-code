Designing a CDK State Machine Builder - Part 1

In my previous [previous post](https://www.10printiamcool.com/visualising-a-cdk-state-machine-using-a-custom-construct), I was a little critical of the CDK approach to defining state machines. In this post, I attempt to design an alternative and share my approach to developing a component API. Whether the result is better or worse than the original, that is in the eye of the beholder.

My main criticism of the CDK approach is as follows:

1. Readability
1. Maintainability
1. Interaction with [Prettier](https://prettier.io/)

Let us take a simple example where we have a state machine consisting of six states in series. Using the CDK approach, we would chain the states together as follows:

```TypeScript
const definition = sfn.Chain.start(
  state1.next(state2.next(state3.next(state4.next(state5.next(state6)))))
);
```

For me, it doesn't score highly on the readability front. The syntax highlighting helps pick out the states, but the required nesting and resulting accumulation of brackets jars my eye. On maintainability, adding another state wouldn't be too bad, but it may not jump out in the pull request. As for [Prettier](https://prettier.io/), it doesn't have much to say in this example. 

Being a critic is easy, but having a go yourself is another thing. The way I like to start is to just write the code as I would ideally like to express the problem. In this case, I have experimented in the problem area before and had the [Fluent Builder Pattern](https://medium.com/xebia-engineering/fluent-builder-pattern-with-a-real-world-example-7b61be375a40) as a possible solution. With this in mind, I wrote the following code:

```TypeScript
const definition = new StateMachineBuilder()
  .perform(state1)
  .perform(state2)
  .perform(state3)
  .perform(state4)
  .perform(state5)
  .perform(state6)
  .build();
```

The idea here is that we add states sequentially to the instantiated `StateMachineBuilder`, and when complete we call the `build` method to return a definition. The advantage is that we can easily see the states and their order, we can easily reorder them, and that [Prettier](https://prettier.io/) will format nicely for us.

To get the code to compile, I started to create a skeleton implementation for `StateMachineBuilder`.

```TypeScript
export default class StateMachineBuilder {
  perform(state: sfn.State): StateMachineBuilder {
    return this;
  }

  build(): sfn.IChainable {
    throw new Error('build not implemented yet');
  }
}
```

At this moment of the development, I am not overly concerned about fleshing out the implementation. For me, the danger of doing adding implementation at this stage is that you make it harder for you to rework the API as you explore the problem space. This runs the risk of tying yourself into abstractions and syntax that you have to live with forever, and that may well have benefitted from refinement.

At this stage, I am content if I can envisage how the implementation would work. In this case, I can envisage the `StateMachineBuilder` accumulating the states, and then wiring them up when `build` is called. Given this, I was happy to proceed to the next example, choices.

For this, I created a CDK definition for the following flow:

TODO: Flow image

The result was as follows:

```TypeScript
const definition = sfn.Chain.start(
  new sfn.Choice(definitionScope, 'Choice1')
    .when(
      sfn.Condition.booleanEquals('$.var1', true),
      new sfn.Choice(definitionScope, 'Choice2')
        .when(sfn.Condition.booleanEquals('$.var2', true), state1)
        .otherwise(state2)
    )
    .otherwise(
      new sfn.Choice(definitionScope, 'Choice3')
        .when(sfn.Condition.booleanEquals('$.var2', true), state3)
        .otherwise(state4)
    )
);
```

On the readability front, I find the distance between the `when` and `otherwise` for `Choice1` to be less than ideal. However, at least [Prettier](https://prettier.io/) has done a decent job with providing meaningful indentation in this case. On the maintainability front, nothing jumps out for the example.

Using the fluent builder approach, I played around with various syntaxes and settled on the following approach: 

```TypeScript
const definition = new StateMachineBuilder()

  .choice('Choice1', {
    choices: [{ when: sfn.Condition.booleanEquals('$.var1', true), next: 'Choice2' }],
    otherwise: 'Choice3',
  })

  .choice('Choice2', {
    choices: [{ when: sfn.Condition.booleanEquals('$.var2', true), next: 'State1' }],
    otherwise: 'State2',
  })

  .choice('Choice3', {
    choices: [{ when: sfn.Condition.booleanEquals('$.var3', true), next: 'Choice3' }],
    otherwise: 'Choice4',
  })

  .perform(state1)
  .end()

  .perform(state2)
  .end()

  .perform(state3)
  .end()

  .perform(state4)
  .end()

  .build(definitionScope);
```

The first big choice (no pun intended) was to have the builder instantiate the `Choice` objects itself. A knock-on effect of this, is that the `build` method now needs to take the scope under which the `Choice` objects are created. This does have the benefit of not having to specify the scope with every `choice`.

The next choice was how to do the branching. In contrast to the CDK approach, I decided on using references to the `id` values of the states. Whilst this could lead to errors, I could envisage the `build` method doing validation and picking these up. Given this, I was happy to go with this approach, as it avoids the problem of ever-increasing indentation as the branches get more and more nested.

I originally went with the approach that the `choice` would drop through to the next step in the flow. However, after experimenting with writing a few mock examples, I felt that having an explicit `otherwise` made the code more readable, whilst also having the benefit of matching the terminology of CDK.

This example brought to light the need for an `end` method. This will indicate to the `StateMachineBuilder` that the previous state is a terminal one. With this, the resulting skeleton implementation for `StateMachineBuilder` became the following:

```TypeScript
interface BuilderChoice {
  when: sfn.Condition;
  next: string;
}

interface BuilderChoiceProps extends sfn.ChoiceProps {
  choices: BuilderChoice[];
  otherwise: string;
}

export default class StateMachineBuilder {
  // Snip

  choice(id: string, props: BuilderChoiceProps): StateMachineBuilder {
    return this;
  }

  end(): StateMachineBuilder {
    return this;
  }

  build(scope: cdk.Construct): sfn.IChainable {
    return new sfn.Succeed(scope, 'TODO');
  }
}
```

TODO: Maps

TODO: Image

```TypeScript
const definition = sfn.Chain.start(
  new sfn.Map(definitionScope, 'Map1', {
    itemsPath: '$.Items1',
  })
    .iterator(state1.next(state2.next(state3.next(state4))))
    .next(
      new sfn.Map(definitionScope, 'Map2', {
        itemsPath: '$.Items2',
      }).iterator(state5.next(state6.next(state7.next(state8))))
    )
);
```

TODO: Becomes

```TypeScript
const definition = new StateMachineBuilder()
  .map('Map1', {
    itemsPath: '$.Items1',
    iterator: new StateMachineBuilder()
      .perform(state1)
      .perform(state2)
      .perform(state3)
      .perform(state4),
  })
  .map('Map2', {
    itemsPath: '$.Items2',
    iterator: new StateMachineBuilder()
      .perform(state5)
      .perform(state6)
      .perform(state7)
      .perform(state8),
  })
  .build(definitionScope);
```

TODO: `StateMachineBuilder`

```TypeScript
interface BuilderMapProps extends sfn.MapProps {
  iterator: StateMachineBuilder;
}

export default class StateMachineBuilder {
  // Snip

  map(id: string, props: BuilderMapProps): StateMachineBuilder {
    return this;
  }
}
```

TODO: Parallels

TODO: Image

```TypeScript
const definition = sfn.Chain.start(
  new sfn.Parallel(definitionScope, 'Parallel1')
    .branch(state1.next(state2))
    .branch(state3.next(state4))
    .next(
      new sfn.Parallel(definitionScope, 'Parallel2')
        .branch(state5.next(state6))
        .branch(state7.next(state8))
    )
);
```

TODO: Becomes

```TypeScript
const definition = new StateMachineBuilder()
  .parallel('Parallel1', {
    branches: [
      new StateMachineBuilder().perform(state1).perform(state2),
      new StateMachineBuilder().perform(state3).perform(state4),
    ],
  })
  .parallel('Parallel2', {
    branches: [
      new StateMachineBuilder().perform(state5).perform(state6),
      new StateMachineBuilder().perform(state7).perform(state8),
    ],
  })
  .build(definitionScope);
```

TODO: `StateMachineBuilder`

```TypeScript
interface BuilderParallelProps extends sfn.ParallelProps {
  branches: StateMachineBuilder[];
}

export default class StateMachineBuilder {
  // Snip

  parallel(id: string, props: BuilderParallelProps): StateMachineBuilder {
    return this;
  }
}
```

TODO: Catches

TODO: Image

```TypeScript

```

TODO: Becomes

```TypeScript

```

TODO: `StateMachineBuilder`

```TypeScript
interface BuilderCatchProps extends sfn.CatchProps {
  handler: string;
}

interface BuilderPerformProps {
  catches?: BuilderCatchProps[];
}

interface BuilderParallelProps extends sfn.ParallelProps {
  branches: StateMachineBuilder[];
  catches?: BuilderCatchProps[];
}

interface BuilderMapProps extends sfn.MapProps {
  iterator: StateMachineBuilder;
  catches?: BuilderCatchProps[];
}

export default class StateMachineBuilder {
  // Snip

  perform(state: sfn.State, props?: BuilderPerformProps): StateMachineBuilder {
    return this;
  }
}
```

Conclusion: In theory, we have an alternative way of defining state machines in CDK. It is more verbose, that is for sure, but the hope is that it is more readable, more maintainable, and plays nicer with [Prettier](https://prettier.io/).

In the next post, we shall see how we get on with implementing the theory.