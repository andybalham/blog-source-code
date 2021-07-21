import { FileEvent, FileHeaderIndex } from '../contracts';

// eslint-disable-next-line import/prefer-default-export
export const handler = async (event: {
  fileEvent: FileEvent;
  configurations: FileHeaderIndex[];
  scenarios: FileHeaderIndex[];
}): Promise<Array<{ scenariosS3Key: string; configurationS3Key: string }>> => {
  //
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event }, null, 2));

  const { fileEvent, configurations, scenarios } = event;

  if (configurations) {
    return configurations.map((c) => ({
      scenariosS3Key: fileEvent.s3Key,
      configurationS3Key: c.s3Key,
    }));
  }

  if (scenarios) {
    return scenarios.map((s) => ({
      scenariosS3Key: s.s3Key,
      configurationS3Key: fileEvent.s3Key,
    }));
  }

  throw new Error(`!configurations && !scenarios`);
};
