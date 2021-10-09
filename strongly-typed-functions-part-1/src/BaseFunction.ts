/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable class-methods-use-this */

import { Context } from 'aws-lambda/handler';

export interface IContext {
  callbackWaitsForEmptyEventLoop: boolean;
}

export default abstract class BaseFunction<TEvent, TResult> {
  //
  event: TEvent;

  context?: Context;

  async handleAsync(event: TEvent, context?: Context): Promise<TResult> {
    //
    if (context) context.callbackWaitsForEmptyEventLoop = false;

    this.event = event;
    this.context = context;

    return this.handleInternalAsync(event, context);
  }

  protected abstract handleInternalAsync(
    event: TEvent,
    context?: Context
  ): Promise<TResult>;
}
