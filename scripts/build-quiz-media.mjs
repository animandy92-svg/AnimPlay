import { writeFile, mkdir } from 'node:fs/promises';
import './import-animal-photos.mjs';
const dir = new URL('../client/public/quiz-media/', import.meta.url);
await mkdir(dir, { recursive: true });
// National flag images from FlagCDN / Flagpedia; source links are retained in each question.
for (const code of ['jp','fr','br','ca','it','ch','in','gb','za','au','de','us','cn','es','ng']) {
  const response = await fetch(`https://flagcdn.com/w640/${code}.png`);
  if (!response.ok || !response.headers.get('content-type')?.includes('image/')) throw new Error(`Flag download failed: ${code}`);
  await writeFile(new URL(`${code}.png`, dir), Buffer.from(await response.arrayBuffer()));
}
// Simplified badge illustrations for identification; no brand names give away answers.
const badges = [
  [190,300,410,520].map(x => `<circle cx="${x}" cy="180" r="72"/>`).join(''),
  '<circle cx="360" cy="180" r="135"/><path d="M360 45L360 180L243 247L360 180L477 247"/>',
  '<circle cx="360" cy="180" r="130" fill="#fff"/><path d="M360 180H250A110 110 0 0 1 360 70ZM360 180H470A110 110 0 0 1 360 290Z" fill="#287abb" stroke="none"/><circle cx="360" cy="180" r="110"/><path d="M250 180H470M360 70V290"/>',
];
for (const [index, badge] of badges.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="360" viewBox="0 0 720 360"><rect width="720" height="360" rx="20" fill="#f6f5fb"/><g fill="none" stroke="#30343b" stroke-width="10" stroke-linejoin="round">${badge}</g></svg>`;
  await writeFile(new URL(`car-symbol-${index+1}.svg`, dir), svg);
}
const labels = [['Books','Games','Art'],['Asia','Europe','Africa'],['Monday','Tuesday','Wednesday'],['Copper','Iron','Zinc'],['Birds','Cats','Dogs'],['Red team','Blue team','Green team'],['Comedy','Drama','Animation'],['Piano','Guitar','Drums'],['Fiction','Poetry','History'],['Tablet','Laptop','Phone']];
for (let i = 0; i < 10; i++) {
  const values = [4+i, 9+i, 6+i];
  const bars = values.map((v,j) => `<rect x="${120+j*160}" y="${270-v*10}" width="90" height="${v*10}" rx="8" fill="${['#8b5cf6','#14b8a6','#f59e0b'][j]}"/><text x="${165+j*160}" y="${250-v*10}" text-anchor="middle" font-size="22" font-weight="700">${v}</text><text x="${165+j*160}" y="306" text-anchor="middle" font-size="18">${labels[i][j]}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="350" viewBox="0 0 720 350"><rect width="720" height="350" rx="20" fill="#f6f5fb"/><g fill="#302749" font-family="Arial,sans-serif"><text x="36" y="42" font-size="22" font-weight="700">Read the chart</text><text x="36" y="70" font-size="15">Number of votes in a fictional survey</text><path d="M90 100V270H650" fill="none" stroke="#a6a0b5" stroke-width="2"/>${bars}</g></svg>`;
  await writeFile(new URL(`chart-${i+1}.svg`, dir), svg);
}
console.log('Saved 15 flags, 15 animal photographs, 3 car symbols, and 10 legacy chart diagrams.');
