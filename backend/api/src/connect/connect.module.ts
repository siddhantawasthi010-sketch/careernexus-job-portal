import { Module } from '@nestjs/common';
import { ConnectController } from './connect.controller';
import { ConnectService } from './connect.service';
import { ConnectTokenGuard } from './connect-token.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ConnectController],
  providers: [ConnectService, ConnectTokenGuard],
})
export class ConnectModule {}
