import { Global, Module } from '@nestjs/common';
import { OdooService } from './odoo.service';

@Global()
@Module({
  providers: [OdooService],
  exports: [OdooService],
})
export class OdooModule {}
