import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('shortest-path')
  getShortestPath(
    @Query('from') from = 'A',
    @Query('to') to = 'F'
  ) {
    return this.appService.computeShortestPath(from, to);
  }
}
