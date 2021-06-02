/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable class-methods-use-this */
import { ConsoleTestLog, TestLog } from './TestLog';

export interface BaseFunctionProps<TEvent> {
  log?: TestLog;
  logEvent?: boolean;
  eventLoggerOverride?: (event: TEvent) => void;
}

export interface IContext {
  callbackWaitsForEmptyEventLoop: boolean;
}

export default abstract class BaseFunction<TEvent, TResult, TContext extends IContext> {
  //
  event: TEvent;

  context?: TContext;

  baseProps: BaseFunctionProps<TEvent> = {
    log: new ConsoleTestLog(),
    logEvent: true,
  };

  constructor(props?: BaseFunctionProps<TEvent>) {
    this.baseProps = { ...this.baseProps, ...props };
  }

  async handleAsync(event: TEvent, context?: TContext): Promise<TResult> {
    //
    if (this.baseProps.logEvent) {
      try {
        await this.logEventAsync(event);
      } catch (error) {
        this.logError('Error logging event', event, error);
      }
    }

    if (context) context.callbackWaitsForEmptyEventLoop = false;

    this.event = event;
    this.context = context;

    return this.handleInternalAsync(event, context);
  }

  protected abstract handleInternalAsync(event: TEvent, context?: TContext): Promise<TResult>;

  async logEventAsync(event: TEvent): Promise<void> {
    if (this.baseProps.log?.debug) {
      this.baseProps.log.debug('Handling event', { event });
    }
  }

  logError(message: string, handledData: any, error: any): void {
    if (this.baseProps.log?.error) {
      this.baseProps.log.error(message, handledData, error);
    } else {
      // eslint-disable-next-line no-console
      console.error(`${error.stack}\n\n${message}: ${JSON.stringify(handledData)}`);
    }
  }
}
