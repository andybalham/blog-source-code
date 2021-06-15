import { FileType } from './FileType';

export interface FileHeader {
  fileType: FileType;
  name: string;
  description?: string;
}

export interface File<T> {
  header: FileHeader;
  body: T;
}
