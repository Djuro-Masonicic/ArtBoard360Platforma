import { Controller, Get, Query } from "@nestjs/common";

import { ListTestimonialsQueryDto } from "./testimonials.dto";
import { TestimonialsService } from "./testimonials.service";

@Controller("testimonials")
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Get()
  listTestimonials(@Query() query: ListTestimonialsQueryDto) {
    return this.testimonialsService.listTestimonials(query);
  }
}
