import SelfDeployFunctionBase from './SelfDeployFunctionBase';
import SelfDeployServiceBase from './SelfDeployServiceBase';

export default abstract class SelfDeployFunction<T> extends SelfDeployFunctionBase {
  //
  constructor(appFileName: string, id: string, public services: T) {
    super(appFileName, id);

    Object.values(services).forEach((service) => {
      this.serviceList.push(service as SelfDeployServiceBase);
    });
  }
}
