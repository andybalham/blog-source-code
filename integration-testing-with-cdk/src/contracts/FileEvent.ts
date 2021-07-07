import { FileHeader } from './File';
import { FileSectionType } from './FileSectionType';

export enum FileEventType {
  Created = 'Created',
  Updated = 'Updated',
}

// export interface FileEvent {
//   eventType: FileEventType;
//   sectionType: FileSectionType;
//   s3Key: string;
//   header: FileHeader;
// }

// export function getFileEventMessageAttributes(fileEvent: FileEvent): Record<string, any> {
//   return {
//     eventType: {
//       DataType: 'String',
//       StringValue: fileEvent.eventType,
//     },
//     sectionType: {
//       DataType: 'String',
//       StringValue: fileEvent.sectionType,
//     },
//   };
// }

export class FileEvent {
  //
  constructor(
    public readonly eventType: FileEventType,
    public readonly sectionType: FileSectionType,
    public readonly s3Key: string,
    public readonly header: FileHeader,
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
