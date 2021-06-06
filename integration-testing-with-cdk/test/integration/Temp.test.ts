import * as child from 'child_process';

describe('Temp', () => {
  it('Run command line', async () => {
    const childProcess: child.ChildProcess = child.exec(
      'aws lambda list-functions',
      (error, stdout, stderr) => {
        const functions = JSON.parse(stdout).Functions;
        console.log(
          JSON.stringify(
            (functions as Array<any>).filter((f) =>
              (f.FunctionName as string).startsWith('SNSFunctionTest-')
            ),
            null,
            2
          )
        );
      }
    );
  });
});
