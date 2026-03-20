import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.type';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { serializeForJson } from '../../common/utils/json-serializer';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { ListTaxonomyQueryDto } from './dto/list-taxonomy-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TaxonomyService } from './taxonomy.service';

@Controller('taxonomy')
@UseGuards(InternalAuthGuard)
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Get('categories')
  listCategories(
    @CurrentUser() user: RequestUser,
    @Query() query: ListTaxonomyQueryDto,
  ) {
    return this.taxonomyService
      .listCategories(user.id, query)
      .then((payload) => serializeForJson(payload));
  }

  @Post('categories')
  createCategory(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.taxonomyService
      .createCategory(user.id, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Patch('categories/:id')
  updateCategory(
    @CurrentUser() user: RequestUser,
    @Param('id') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.taxonomyService
      .updateCategory(user.id, categoryId, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Post('categories/:id/disable')
  disableCategory(
    @CurrentUser() user: RequestUser,
    @Param('id') categoryId: string,
  ) {
    return this.taxonomyService
      .disableCategory(user.id, categoryId)
      .then((payload) => serializeForJson(payload));
  }

  @Get('tags')
  listTags(@CurrentUser() user: RequestUser, @Query() query: ListTaxonomyQueryDto) {
    return this.taxonomyService
      .listTags(user.id, query)
      .then((payload) => serializeForJson(payload));
  }

  @Post('tags')
  createTag(@CurrentUser() user: RequestUser, @Body() dto: CreateTagDto) {
    return this.taxonomyService
      .createTag(user.id, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Patch('tags/:id')
  updateTag(
    @CurrentUser() user: RequestUser,
    @Param('id') tagId: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.taxonomyService
      .updateTag(user.id, tagId, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Post('tags/:id/disable')
  disableTag(@CurrentUser() user: RequestUser, @Param('id') tagId: string) {
    return this.taxonomyService
      .disableTag(user.id, tagId)
      .then((payload) => serializeForJson(payload));
  }
}
