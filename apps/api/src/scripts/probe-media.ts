import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { MediaSigningProbeResult, MediaUploadProbeResult } from '@bakki/domain';
import { AppModule } from '../app.module';
import { MediaService } from '../modules/media/media.service';

async function main() {
  const args = new Set(process.argv.slice(2));
  const json = args.has('--json');
  const upload = args.has('--upload');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const media = app.get(MediaService);
    if (upload) {
      const result: MediaUploadProbeResult = await media.createUploadProbe();
      if (json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(`Configured: ${result.configured ? 'yes' : 'no'}`);
      console.log(`Object key: ${result.objectKey ?? 'n/a'}`);
      console.log(`Uploaded: ${result.uploaded ? 'yes' : 'no'}`);
      console.log(`Verified readable: ${result.verifiedReadable === null ? 'n/a' : result.verifiedReadable ? 'yes' : 'no'}`);
      console.log(`Cleanup succeeded: ${result.cleanupSucceeded === null ? 'n/a' : result.cleanupSucceeded ? 'yes' : 'no'}`);
      console.log(`Message: ${result.message}`);
      return;
    }

    const result: MediaSigningProbeResult = await media.createSigningProbe();
    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`Configured: ${result.configured ? 'yes' : 'no'}`);
    console.log(`Upload URL generated: ${result.uploadUrlGenerated ? 'yes' : 'no'}`);
    console.log(`Bucket reachable: ${result.bucketReachable === null ? 'n/a' : result.bucketReachable ? 'yes' : 'no'}`);
    console.log(`Object key: ${result.objectKey ?? 'n/a'}`);
    console.log(`Message: ${result.message}`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Media probe failed: ${message}`);
  process.exitCode = 1;
});
