export interface PanoramaCrop {fit:'contain'|'cover';zoom:number;x:number;y:number}
export interface ArtworkEdit {artworkId:string;title?:string;description?:string;crop?:PanoramaCrop}
export interface PromotionConfig {
  artworkIds:string[]; template:number; version:number; color:'light'|'dark'; language:'ME'|'EN';
  name:string; instagram:string; title:string|null; collectionTitle?:string|null; description:string; signature:'logo'|'instagram';
  sourceCollectionId?:string; panoramaCrop?:PanoramaCrop; publicationTitle?:string|null;
  artworkEdits?:ArtworkEdit[];
}
export interface PromotionSource {
  name:string; avatar:string|null; form:string; profileUrl:string; shortUrl:string; qrPath:string; qrView:string;
  works:Array<{id:string;title:string|null;imageUrl:string;description?:string|null}>; tech?:string;year?:number;
  collections?:Array<{id:string;title:string;artworkIds:string[]}>;
}
export interface PromotionUsage {plan:'FREE'|'PREMIUM';used:number;reserved:number;limit:number;remaining:number;purchased:number;periodStart:string|null;periodEnd:string|null}
export const catalog:{templates:Array<{name:string;vers:Array<[string,string|null,string|null]>}>;meta:Record<string,[number,boolean,number,boolean]>};
export const blank:string;
export const CURRENT_RENDERER_VERSION:number;
export function selectionRules(c:Pick<PromotionConfig,'template'|'version'>):{min:number;max:number;carousel:boolean;hint:string};
export function generationIssues(c:PromotionConfig):string[];
export function cropMetrics(width:number,height:number,crop:PanoramaCrop):{scale:number;cropped:number};
export function rendererVersionFor(c:Pick<PromotionConfig,'template'|'version'>&Partial<Pick<PromotionConfig,'artworkEdits'>>):number;
export function editorPatch(state:any,patch:any,source:PromotionSource):any;
export function selected(c:PromotionConfig,rendererVersion?:number):{template:string;version:string;code:string;color:string;slides:number};
export function css(s:string):Record<string,string>;
export function initialState(c:PromotionConfig,s:PromotionSource,u:PromotionUsage):any;
export function configFromState(s:any,source:PromotionSource):PromotionConfig;
export function configKey(c:PromotionConfig):string;
export function contentKey(c:PromotionConfig,s:PromotionSource,rendererVersion?:number):string;
export function view(theme:string,s:any,source:PromotionSource,update:(p:any)=>void,actions:any,u:PromotionUsage,rendererVersion?:number):any;
export function renderUi(theme:string,v:any,h:any,F:any):any;
export function renderGraphic(theme:string,v:any,h:any,F:any):any;
export function graphicHTML(snapshot:{config:PromotionConfig;source:PromotionSource;rendererVersion?:number},slide?:number):string;
