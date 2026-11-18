import { Global, Module } from '@nestjs/common';
import { LocalStorageService, StorageService } from './storage.service';

@Global()
@Module({
  providers: [LocalStorageService, { provide: StorageService, useExisting: LocalStorageService }],
  exports: [StorageService, LocalStorageService],
})
export class StorageModule {}
