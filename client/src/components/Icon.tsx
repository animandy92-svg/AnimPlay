export default function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    quizzes: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
    discover: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    groups: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    assignments: 'M8 4H5v17h14V4h-3 M8 2h8v5H8z M8 12h8 M8 16h5',
    reports: 'M4 3v18h17 M8 16v-5 M13 16V7 M18 16V4',
    plus: 'M12 5v14 M5 12h14', play: 'M8 4v16l13-8z',
    star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
    folder: 'M3 7V4h6l2 3h10v13H3z', edit: 'm15 5 4 4 M4 20l4-1L21 6l-4-4L4 15z',
    trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
    menu: 'M4 6h16 M4 12h16 M4 18h16', close: 'm6 6 12 12 M6 18 18 6',
    logout: 'M9 4H3v16h6 M9 12h12 M17 8l4 4-4 4', image: 'M3 3h18v18H3z m0 14 6-6 5 5 3-3 4 4 M15 7h.01',
    text: 'M4 5h16 M12 5v15 M8 20h8', arrow: 'M4 12h16 m-6-6 6 6-6 6',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.quizzes} /></svg>;
}
