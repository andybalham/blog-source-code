import { FileSectionType } from './FileSectionType';
import { FileType } from './FileType';

export interface FileHash {
  s3Key: string;
  sectionType: FileSectionType;
  fileType: FileType;
  sectionHash: string;
}