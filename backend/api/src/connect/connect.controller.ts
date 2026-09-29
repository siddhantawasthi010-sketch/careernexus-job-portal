import { Body, Controller, Get, Patch, Post, Query, Param } from '@nestjs/common';
import { ConnectService } from './connect.service';

@Controller('connect')
export class ConnectController {
  constructor(private readonly connectService: ConnectService) {}

  @Get('search')
  search(@Query('email') email: string, @Query('role') role: string, @Query('q') query: string) {
    return this.connectService.search(email, role, query);
  }

  @Get()
  getOverview(@Query('email') email: string) {
    return this.connectService.getOverview(email);
  }

  @Post('requests')
  sendRequest(@Body() body: { email: string; targetEmail: string }) {
    return this.connectService.sendRequest(body.email, body.targetEmail);
  }

  @Patch('requests/:requestId')
  respond(@Param('requestId') requestId: string, @Body() body: { email: string; status: string }) {
    return this.connectService.respond(body.email, requestId, body.status);
  }
}
