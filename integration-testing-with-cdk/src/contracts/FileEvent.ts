import { FileSectionType } from './FileSectionType';

export enum FileEventType {
  Created = 'Created',
  Updated = 'Updated',
  Deleted = 'Deleted',
}

export interface FileEvent {
  eventType: FileEventType;
  sectionType: FileSectionType;
  s3Key: string;
}
