import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReportDetail from '../src/pages/ReportDetail';

vi.mock('../src/services/api', () => ({ api: { reports: { detail: async () => ({
  game: { quiz_title: 'Review report', ended_at: '2026-10-01T08:00:00Z', settings: { playStyle: 'accuracy' } },
  questions: [{ questionIndex: 0, questionText: 'Which planet?', correctAnswer: 'Mars', correctCount: 0, playerCount: 1, answeredCount: 1, averageResponseMs: 2500, distribution: [] }],
  results: [{ id: 'p1', nickname: '=Unsafe formula', score: 0, correct: 0, total: 1, history: [{ questionIndex: 0, questionText: 'Which planet?', answer: 'Venus, "nearby"', correctAnswer: 'Mars', correct: false, points: 0, responseTimeMs: 2500 }] }],
}) } } }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test('exports the displayed learning report with escaped CSV values', async () => {
  const create = vi.fn((_blob: Blob) => 'blob:report-test');
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: vi.fn() });
  let savedName = '';
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function(this: HTMLAnchorElement) { savedName = this.download; });
  render(<MemoryRouter initialEntries={['/reports/123']}><Routes><Route path="/reports/:gameId" element={<ReportDetail />} /></Routes></MemoryRouter>);
  await screen.findByText('Review report');
  expect(screen.getByText('0%')).toBeTruthy();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Download CSV' }));
  expect(savedName).toBe('animplay-report-123.csv');
  expect(create).toHaveBeenCalledOnce();
  const csv = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(create.mock.calls[0][0] as Blob);
  });
  expect(csv).toContain('"Player","Question","Answer","Correct answer","Correct","Points","Response seconds"');
  expect(csv).toContain("'=Unsafe formula");
  expect(csv).toContain('"Venus, ""nearby"""');
  expect(csv).toContain('"Mars","No","0","2.50"');
});
