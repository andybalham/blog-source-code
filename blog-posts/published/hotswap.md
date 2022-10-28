# Using `--hotswap` to fix the implementation

AWS fairly recently introduced 
https://github.com/aws/aws-cdk/blob/master/packages/aws-cdk/README.md#hotswap-deployments-for-faster-development

`cdk deploy --hotswap`

Add a `console.log` and redeploy

```TypeScript
const durationLeftDays = deadlineDate.diff(DateTime.now(), 'days').days;

console.log(JSON.stringify({ durationLeftDays }, null, 2));
```

```json
{
  "durationLeftDays": -4.041779918981481
}
```

The fix

```TypeScript
const durationLeftDays = DateTime.now().diff(deadlineDate, 'days').days;
```


