import SelfDeployService from './SelfDeployService';
import SelfDeployFunctionBase from './SelfDeployFunctionBase';

export default abstract class SelfDeployFunction<T> extends SelfDeployFunctionBase {
  //
  constructor(appFileName: string, id: string, public services: T) {
    super(appFileName, id);

    Object.values(services).forEach((service) => {
      this.serviceList.push(service as SelfDeployService);
    });
  }
}
