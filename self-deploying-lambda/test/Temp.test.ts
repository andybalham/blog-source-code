/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { expect } from 'chai';

describe('Temp', () => {
  it('Regex matching', async () => {
    const name = 'DeadlineRouterTestStack-RouterFunctionE8DD11A6-BJpeuFqKg0up';
    const nodePath = 'DeadlineRouterTestStack/RouterFunction';

    const logicalId = getLogicalId(name, nodePath);

    expect(logicalId).to.equal('RouterFunctionE8DD11A6');
  });
});

function getLogicalId(name: string, nodePath: string): string | undefined {
  //
  const nodePathParts = nodePath.split('/');

  const stackName = nodePathParts[0];
  const functionPrefix = nodePathParts.length > 2 ? nodePathParts.slice(1, -1).join('') : '';
  const functionId = nodePathParts[nodePathParts.length - 1];

  const logicalIdRegex = `^${stackName}[-]${functionPrefix}(?<logicalId>${functionId}[^-]+)`;
  const logicalId = name.match(logicalIdRegex)?.groups?.logicalId;

  console.log(JSON.stringify({ stackName, functionPrefix, functionId, logicalId }, null, 2));

  return logicalId;
}
