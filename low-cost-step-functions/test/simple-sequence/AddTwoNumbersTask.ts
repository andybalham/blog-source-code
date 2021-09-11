/* eslint-disable class-methods-use-this */
import LambdaTask from '../../src/LambdaTask';

export default class AddTwoNumbersTask extends LambdaTask {
  getLambdaId(): string {
    return AddTwoNumbersTask.name;
  }
}
