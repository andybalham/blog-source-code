/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import SelfDeployFunction from './package/SelfDeployFunction';
import SelfDeployTopic from './package/SelfDeployTopic';

interface EventPublishingServices {
  testTopic: SelfDeployTopic;
}

export default class EventPublishingFunction extends SelfDeployFunction<EventPublishingServices> {
  async handleEventAsync(event: any): Promise<any> {
    await this.services.testTopic.publishAsync({
      Message: JSON.stringify(event),
    });
  }
}
