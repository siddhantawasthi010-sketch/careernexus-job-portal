import { Body, Controller, Delete, Get, Patch, Post, Query, Param, UseGuards } from '@nestjs/common';
import { ConnectService } from './connect.service';
import { ConnectTokenGuard } from './connect-token.guard';

@Controller('connect')
@UseGuards(ConnectTokenGuard)
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

  @Delete('requests/:requestId')
  cancelRequest(@Param('requestId') requestId: string, @Query('email') email: string) {
    return this.connectService.cancelRequest(email, requestId);
  }

  @Get('referrals')
  getReferrals(@Query('email') email: string) {
    return this.connectService.getReferrals(email);
  }

  @Post('referrals')
  sendReferral(@Body() body: { email: string; targetEmail: string; job: Record<string, unknown> }) {
    return this.connectService.sendReferral(body.email, body.targetEmail, body.job);
  }

  @Delete('connections/:targetEmail')
  removeConnection(@Param('targetEmail') targetEmail: string, @Query('email') email: string) {
    return this.connectService.removeConnection(email, targetEmail);
  }

  @Get('messages')
  getMessages(@Query('email') email: string) {
    return this.connectService.getMessages(email);
  }

  @Post('messages')
  sendMessage(@Body() body: { email: string; targetEmail: string; body: string; job?: Record<string, unknown> }) {
    return this.connectService.sendMessage(body.email, body.targetEmail, body.body, body.job);
  }

  @Patch('messages/permissions/:candidateEmail')
  approveMessages(@Param('candidateEmail') candidateEmail: string, @Body() body: { email: string }) {
    return this.connectService.approveMessages(body.email, candidateEmail);
  }

  @Get('notifications')
  getNotifications(@Query('email') email: string) {
    return this.connectService.getNotifications(email);
  }
}
