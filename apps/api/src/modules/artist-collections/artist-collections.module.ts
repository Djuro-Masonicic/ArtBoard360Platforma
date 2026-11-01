import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ArtistCollectionsController } from "./artist-collections.controller";
import { ArtistCollectionsService } from "./artist-collections.service";
import { CollectionsPrismaService } from "./collections-prisma.service";

@Module({ imports: [AuthModule], controllers: [ArtistCollectionsController], providers: [ArtistCollectionsService, CollectionsPrismaService] })
export class ArtistCollectionsModule {}
