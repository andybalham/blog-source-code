import { FileHeader } from './File';

export interface FileHeaderIndex {
  s3Key: string;
  header: FileHeader;
}
