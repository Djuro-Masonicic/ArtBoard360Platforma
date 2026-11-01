import { BadRequestException,Body,CanActivate,Controller,ExecutionContext,Get,Header,HttpException,Injectable,Param,ParseUUIDPipe,Post,Put,Query,Req,Res,UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ArtistAuthGuard,type ArtistRequest } from '../auth/artist-auth.guard';
import { PromotionsService } from './promotions.service';
import { PromotionPurchaseService } from './promotion-purchase.service';
import { GeneratePromotionDto,PromotionPurchaseDto,SavePromotionDto } from './promotions.dto';
@Injectable()
class PromotionRateGuard implements CanActivate{
  private attempts=new Map<string,{n:number;until:number}>();
  canActivate(ctx:ExecutionContext){const r=ctx.switchToHttp().getRequest<ArtistRequest>(),now=Date.now();for(const[k,v]of this.attempts)if(v.until<now)this.attempts.delete(k);
    const id=r.artistUser!.id+':'+(r.method==='GET'?'read':'write'),v=this.attempts.get(id)||{n:0,until:now+60000},max=r.method==='GET'?120:12;
    if(v.n>=max||this.attempts.size>10000)throw new HttpException('Previše zahtjeva. Pokušaj za minut.',429);v.n++;this.attempts.set(id,v);return true;}
}
@Controller('artist/promotions')
@UseGuards(ArtistAuthGuard,PromotionRateGuard)
export class PromotionsController{
  constructor(private readonly service:PromotionsService,private readonly purchases:PromotionPurchaseService){}
  @Get() @Header('Cache-Control','private, no-store') get(@Req()r:ArtistRequest,@Query('page')value?:string){const page=Number(value||1);if(!Number.isSafeInteger(page)||page<1||page>100000)throw new BadRequestException();return this.service.get(r.artistUser!.id,page);}
  @Put('draft') @Header('Cache-Control','private, no-store') save(@Req()r:ArtistRequest,@Body()d:SavePromotionDto){return this.service.save(r.artistUser!.id,d);}
  @Post('generations') @Header('Cache-Control','private, no-store') generate(@Req()r:ArtistRequest,@Body()d:GeneratePromotionDto){return this.service.generate(r.artistUser!.id,d);}
  @Post('purchases') @Header('Cache-Control','private, no-store') purchase(@Req()r:ArtistRequest,@Body()d:PromotionPurchaseDto){return this.purchases.intent(r.artistUser!.id,d.operationKey);}
  @Get('generations/:id') @Header('Cache-Control','private, no-store') version(@Req()r:ArtistRequest,@Param('id',new ParseUUIDPipe({version:'4'}))id:string){return this.service.version(r.artistUser!.id,id);}
  @Get('generations/:id/download/:format') async download(@Req()r:ArtistRequest,@Param('id',new ParseUUIDPipe({version:'4'}))id:string,@Param('format')format:string,@Res()res:Response){
    if(!/^(bundle|thumbnail|[0-9]|10)$/.test(format))throw new BadRequestException();
    const file=await this.service.download(r.artistUser!.id,id,format);
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type',file.mime);
    if(format!=='thumbnail')res.setHeader('Content-Disposition',`attachment; filename="${file.name}"`);res.send(file.body);
  }
}
