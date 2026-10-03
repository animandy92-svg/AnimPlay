// Fetch specifically chosen real photographs and retain their individual attribution.
import { mkdir, writeFile } from 'node:fs/promises';
const selections = [
  ['Lion', '020 The lion king Snyggve in the Serengeti National Park Photo by Giles Laurent.jpg'],
  ['Elephant', '178 Male African bush elephant in Etosha National Park Photo by Giles Laurent.jpg'],
  ['Giraffe', 'Giraffa camelopardalis 7zz.jpg'],
  ['Zebra', 'Equus quagga burchellii - Etosha, 2014.jpg'],
  ['Cat', 'Siam lilacpoint.jpg'],
  ['Dog', 'Golden Retriever Carlos (10581910556).jpg'],
  ['Rabbit', 'Oryctolagus cuniculus Rcdo.jpg'],
  ['Panda', 'Grosser Panda.JPG'],
  ['Penguin', 'South Shetland-2016-Deception Island–Chinstrap penguin (Pygoscelis antarctica) 04.jpg'],
  ['Frog', 'Red-eyed Leaf Frog (49661076226).jpg'],
  ['Turtle', 'Red-eared slider.jpg'],
  ['Monkey', 'Ubud Monkey Family.jpg'],
  ['Horse', 'Nokota Horses cropped.jpg'],
  ['Butterfly', 'Fesoj - Papilio machaon (by).jpg'],
  ['Fish', 'Gold fish1.jpg'],
];
const headers = { 'User-Agent': 'AnimPlayQuiz/1.0 (educational animal picture quiz)' };
const params = new URLSearchParams({ action: 'query', titles: selections.map(([, file]) => `File:${file}`).join('|'),
  prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '800', format: 'json' });
const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers, signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Commons metadata: ${response.status}`);
const data = await response.json();
const pages = Object.values(data.query.pages);
const text = html => String(html || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const mediaDir = new URL('../client/public/quiz-media/', import.meta.url);
await mkdir(mediaDir, { recursive: true });
const records = [];
for (const [index, [animal, file]] of selections.entries()) {
  const page = pages.find(p => p.title.replace(/_/g, ' ') === `File:${file}`);
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`Missing photograph: ${animal} / ${file}`);
  const meta = info.extmetadata, license = text(meta.LicenseShortName?.value), artist = text(meta.Artist?.value);
  if (!artist || !/CC BY|CC0|Public domain/i.test(license)) throw new Error(`Unsupported attribution: ${animal} / ${license}`);
  const downloadUrl = info.thumburl || info.url;
  const photo = await fetch(downloadUrl, { headers, signal: AbortSignal.timeout(30000) });
  if (!photo.ok || !photo.headers.get('content-type')?.startsWith('image/')) throw new Error(`Photo download: ${animal} / ${photo.status}`);
  const bytes = Buffer.from(await photo.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`Expected JPEG: ${animal}`);
  const src = `/quiz-media/animal-${index+1}.jpg`;
  await writeFile(new URL(`animal-${index+1}.jpg`, mediaDir), bytes);
  records.push({ animal, src, author: artist, license, licenseUrl: meta.LicenseUrl?.value || '',
    sourceUrl: info.descriptionurl, downloadUrl, file, retrievedAt: '2026-10-03' });
  console.log(`Saved ${animal}: ${license}`);
}
await writeFile(new URL('../client/src/data/animal-photos.json', import.meta.url), JSON.stringify(records, null, 2) + '\n');
await writeFile(new URL('animal-photo-credits.json', mediaDir), JSON.stringify(records, null, 2) + '\n');
