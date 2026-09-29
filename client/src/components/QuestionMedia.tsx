import { useState } from 'react';
import type { QuestionMedia as Media } from '../data/library';
export default function QuestionMedia({ media }: { media?: Media }) {
  const [failedSrc, setFailedSrc] = useState('');
  if (!media) return null;
  return <figure className="question-media">
    {failedSrc === media.src ? <p role="alert">Image unavailable. {media.alt}</p> : <img src={media.src} alt={media.alt} onError={() => setFailedSrc(media.src)} />}
    <figcaption><a href={media.sourceUrl} target="_blank" rel="noreferrer">{media.credit}</a></figcaption>
  </figure>;
}
