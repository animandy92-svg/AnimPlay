import { writeFile, mkdir } from 'node:fs/promises';
const dir = new URL('../client/public/quiz-media/', import.meta.url);
await mkdir(dir, { recursive: true });
// National flag images from FlagCDN / Flagpedia; source links are retained in each question.
for (const code of ['jp','fr','br','ca','it','ch','in','gb','za','au']) {
  const response = await fetch(`https://flagcdn.com/w640/${code}.png`);
  if (!response.ok || !response.headers.get('content-type')?.includes('image/')) throw new Error(`Flag download failed: ${code}`);
  await writeFile(new URL(`${code}.png`, dir), Buffer.from(await response.arrayBuffer()));
}
const labels = [['Books','Games','Art'],['Asia','Europe','Africa'],['Monday','Tuesday','Wednesday'],['Copper','Iron','Zinc'],['Birds','Cats','Dogs'],['Red team','Blue team','Green team'],['Comedy','Drama','Animation'],['Piano','Guitar','Drums'],['Fiction','Poetry','History'],['Tablet','Laptop','Phone']];
for (let i = 0; i < 10; i++) {
  const values = [4+i, 9+i, 6+i];
  const bars = values.map((v,j) => `<rect x="${120+j*160}" y="${270-v*10}" width="90" height="${v*10}" rx="8" fill="${['#8b5cf6','#14b8a6','#f59e0b'][j]}"/><text x="${165+j*160}" y="${250-v*10}" text-anchor="middle" font-size="22" font-weight="700">${v}</text><text x="${165+j*160}" y="306" text-anchor="middle" font-size="18">${labels[i][j]}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="350" viewBox="0 0 720 350"><rect width="720" height="350" rx="20" fill="#f6f5fb"/><g fill="#302749" font-family="Arial,sans-serif"><text x="36" y="42" font-size="22" font-weight="700">Read the chart</text><text x="36" y="70" font-size="15">Number of votes in a fictional survey</text><path d="M90 100V270H650" fill="none" stroke="#a6a0b5" stroke-width="2"/>${bars}</g></svg>`;
  await writeFile(new URL(`chart-${i+1}.svg`, dir), svg);
}
console.log('Saved 10 flag images and 10 original chart diagrams.');
