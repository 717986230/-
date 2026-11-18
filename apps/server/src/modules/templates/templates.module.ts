import { Module } from '@nestjs/common';
import { AdminTemplatesController, TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  controllers: [TemplatesController, AdminTemplatesController],
  providers: [TemplatesService],
})
export class TemplatesModule {}
