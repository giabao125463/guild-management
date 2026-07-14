import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Permission } from '@guild/shared-types';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RequirePermissions(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'Global search across members' })
  search(@Query() query: PaginationDto, @Query('q') q?: string) {
    return this.searchService.globalSearch(
      q ?? query.search ?? '',
      query.page,
      query.limit,
    );
  }
}
