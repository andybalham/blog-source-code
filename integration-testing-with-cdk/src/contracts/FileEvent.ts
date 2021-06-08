import { FileSectionType } from './FileSectionType';

export enum FileEventType {
  Created = 'Created',
  Updated = 'Updated',
}

export class FileEvent {
  //
  constructor(
    public readonly eventType: FileEventType,
    public readonly sectionType: FileSectionType,
    public readonly s3Key: string
  ) {}

  get messageAttributes(): Record<string, any> {
    return {
      eventType: {
        DataType: 'String',
        StringValue: this.eventType,
      },
      sectionType: {
        DataType: 'String',
        StringValue: this.sectionType,
      },
    };
  }
}
