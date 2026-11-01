import { Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class CollectionVersionDto {
  @Matches(/^[a-f0-9]{64}$/)
  expectedVersion!: string;
}

export class CreateArtistCollectionDto extends CollectionVersionDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(160)
  title!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(4000)
  description?: string | null;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(40)
  year?: string | null;

  @IsOptional() @IsUUID("4")
  coverArtworkId?: string | null;
}

export class SaveArtistCollectionDto extends CreateArtistCollectionDto {
  @IsUUID("4") id!: string;
  @IsArray() @ArrayUnique() @IsUUID("4", { each: true }) artworkIds!: string[];
}

export class UpdateArtistCollectionDto extends CollectionVersionDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(160)
  title?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(4000)
  description?: string | null;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(40)
  year?: string | null;

  @IsOptional() @IsUUID("4")
  coverArtworkId?: string | null;
}

export class ReorderArtistCollectionsDto extends CollectionVersionDto {
  @IsArray() @ArrayMaxSize(1000) @ArrayUnique() @IsUUID("4", { each: true })
  ids!: string[];
}

export class MoveCollectionArtworksDto extends CollectionVersionDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(1000) @ArrayUnique() @IsUUID("4", { each: true })
  artworkIds!: string[];

  // null explicitly detaches; omission and arbitrary strings are invalid.
  @ValidateIf((_, value) => value !== null) @IsUUID("4")
  collectionId!: string | null;
}

export class ReorderCollectionArtworksDto extends CollectionVersionDto {
  @IsArray() @ArrayMaxSize(1000) @ArrayUnique() @IsUUID("4", { each: true })
  artworkIds!: string[];
}
