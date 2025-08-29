// // import 'dotenv/config';
// // import { db } from '../src/db/client';
// // import { offers, offerMethods } from '../src/db/schema';

// async function main() {
//   const sky = await db.insert(offers).values({
//     slug: 'skyspin',
//     name: 'SkySpin',
//     rating: '4.6',
//     payoutHours: 36,
//     license: 'MGA',
//     link: 'https://partner.example/skyspin',
//     enabled: true,
//     position: 1,
//   }).returning({ id: offers.id });

//   await db.insert(offerMethods).values([
//     { offerId: sky[0].id, method: 'Cards' },
//     { offerId: sky[0].id, method: 'SEPA' },
//   ]);

//   console.log('Seed ok');
//   process.exit(0);
// }
// main().catch(e => { console.error(e); process.exit(1); });