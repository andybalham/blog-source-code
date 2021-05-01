import * as fs from 'fs';
import path from 'path';
import { StateMachineWithGraph } from '../src/constructs';

// eslint-disable-next-line import/prefer-default-export
export function writeGraphJson(stateMachine: StateMachineWithGraph): void {
  //
  const stateMachinePath = path.join(__dirname, 'stateMachines');

  if (!fs.existsSync(stateMachinePath))
    fs.mkdirSync(stateMachinePath);

  fs.writeFileSync(
    path.join(stateMachinePath, `${stateMachine.node.id}.asl.json`),
    stateMachine.graphJson
  );
}
