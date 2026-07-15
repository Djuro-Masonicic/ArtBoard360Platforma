import { Controller, Get, Query } from "@nestjs/common";

import { FaqsService } from "./faqs.service";
import { ListFaqsQueryDto } from "./faqs.dto";

@Controller("faqs")
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Get()
  listFaqs(@Query() query: ListFaqsQueryDto) {
    return this.faqsService.listFaqs(query);
  }
}
