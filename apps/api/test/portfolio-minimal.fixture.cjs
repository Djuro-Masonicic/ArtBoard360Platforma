const { defaultDocumentSelection } = require('@artboard/portfolio-document-plan');
async function minimalFixture(images) {
  if (!images) {
    const sharp = require('sharp'); images=[];
    for(let i=0;i<10;i++) images.push('data:image/jpeg;base64,'+(await sharp({create:{width:240,height:300,channels:3,background:['#4679ed','#fa614a','#f2bc48','#965ad4'][i%4]}}).jpeg().toBuffer()).toString('base64'));
  }
  const row = (id, values) => ({id,values});
  const selection=defaultDocumentSelection(true);selection.sections.featured=true;
  return {
    id:'00000000-0000-4000-8000-000000000001',collectionSchemaVersion:2,revision:1,artistName:'Tijana Marković',title:'Minimal reference',
    discipline:'Ilustracija',location:'Crna Gora',email:'tijamarkovic03@gmail.com',phone:'+382 …',dateOfBirth:'2000-02-29',
    behanceUrl:'https://behance.net/tijanamarkovic4',instagramUrl:'https://instagram.com/mawatitaa',artboardProfileUrl:'https://artstudio360.me/artist/tijana-markovic',
    profileImageUrl:images[9],coverImageUrl:images[3],template:'INSTITUTIONAL_MINIMAL',pageFormat:'A4',fontStyle:'SANS',language:'ME',includeBranding:true,includeCv:true,includePrices:false,
    createdAt:new Date('2026-01-01T00:00:00Z'),updatedAt:new Date('2026-01-01T00:00:00Z'),
    biography:'Tijana Marković, poznata i pod nadimkom Tić, dolazi iz Nikšića i trenutno je studentkinja treće godine Fakulteta za dizajn i multimediju na Univerzitetu Donja Gorica. Po struci skoro-grafička dizajnerka, poznata je po svojoj radoznalosti i stalnoj potrebi da istražuje, mijenja medije i balansira između različitih interesovanja.\n\nCrtanje i slikanje prate je od djetinjstva kao način izražavanja i zabave, a s vremenom su prerasli u ozbiljniji oblik stvaralaštva. Tokom studija razvila je i interesovanje za motion design, koji joj je otvorio prostor za kombinovanje slike, pokreta i zvuka.\n\nInspiraciju pronalazi u svakodnevnim situacijama – gestovima, ljudima i trenucima koji je okružuju. Muzika i filmovi često imaju snažan uticaj na njen rad, koji nerijetko poprimi neplanirani pravac, što i jeste ono što najviše cijeni u procesu stvaranja.\n\nNjen rad predstavlja spoj opažanja, osjećanja i vizuelne igre – izraz koji se stalno razvija, mijenja i raste zajedno s njom.',
    motto:'"Moja mašta na nekoj drugoj planeti izaziva požare."',mottoAuthor:'Autor citata',artistStatement:'Kratak opis umjetničkog rada — teme, tehnike i pristup.',
    designConfig:{minimal:{version:1,cover:'A'},documentSelection:selection},
    collections:[{id:'group',title:'Naziv kolekcije',year:'Godina',description:'Opis kolekcije — tema i ideja koja povezuje radove, inspiracija, period nastanka, tehnike i materijali, broj radova u kolekciji i gdje je kolekcija izlagana.\n\nRadovi u kolekciji mogu se zatim predstaviti pojedinačno, sa detaljnim opisom svakog rada na narednim stranama.',coverImageUrl:images[3],orderIndex:0,isIncluded:true}],
    artworks:Array.from({length:9},(_,i)=>({id:'work-'+i,portfolioId:'00000000-0000-4000-8000-000000000001',imageUrl:images[i],title:'Naziv rada',year:'Godina',technique:'Tehnika, materijal, dimenzije',dimensions:'',description:'Opis rada — ideja i inspiracija, proces nastanka, tehnika i materijali, dimenzije, te gdje je rad izlagan ili objavljen.',orderIndex:i,isSelected:true,portfolioCollectionId:[3,4,5].includes(i)?'group':null,collectionOrderIndex:i,availability:'UNKNOWN'})),
    cvSections:{version:1,education:Array.from({length:3},(_,i)=>row('edu-'+i,{period:'01.2020 – 06.2024',institution:'Ustanova, univerzitet',degree:'Smjer, zvanje',location:'Mjesto, država'})),experience:Array.from({length:3},(_,i)=>row('exp-'+i,{period:'01.2025 – danas',organization:'Organizacija',position:'Pozicija',location:'Mjesto, država',description:'Kratak opis posla — odgovornosti, projekti i rezultati na kojima je umjetnik radio.'})),exhibitions:Array.from({length:3},(_,i)=>row('exh-'+i,{year:'05.2025',title:'Naziv izložbe',location:'Lokacija',type:'Samostalna / grupna izložba'})),awards:Array.from({length:3},(_,i)=>row('award-'+i,{year:'2024',title:'Naziv nagrade',category:'Kategorija, takmičenje',location:'lokacija, godina'})),certificates:Array.from({length:3},(_,i)=>row('cert-'+i,{title:'Naziv sertifikata',field:'Disciplina',issuer:'Kompanija, godina'})),publications:Array.from({length:3},(_,i)=>row('pub-'+i,{title:'Naziv publikacije',issuer:'Izdavač, godina',link:'https://example.com'})),skills:Array(8).fill('Vještina').join(', '),programs:Array(8).fill('Program').join(', ')}
  };
}
module.exports={minimalFixture};
