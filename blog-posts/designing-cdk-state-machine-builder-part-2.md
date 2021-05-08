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
    at <snip>

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
