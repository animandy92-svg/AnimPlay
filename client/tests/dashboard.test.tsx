import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QUIZ_LIBRARY } from '../src/data/library';
import Dashboard from '../src/pages/Dashboard';
vi.mock('../src/services/api', () => ({ api: {
  quizzes: { list: async (tab: string) => ({ quizzes: tab === 'trash' ? [] : QUIZ_LIBRARY.map(q => ({ ...q, question_count: q.questions.length, is_favorite: 0, deleted_at: null, created_at: '2026-09-29', updated_at: '2026-09-29' })) }), update: vi.fn().mockResolvedValue({}) },
  folders: { list: async () => ({ folders: [] }) },
} }));
afterEach(cleanup);
test('shows the 30 quizzes and combines search, subject and format filters', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  await screen.findByText('30 quizzes in your library');
  expect(screen.queryByText('Load Sample Quiz')).toBeNull();
  await user.selectOptions(screen.getByLabelText('Question format'), 'image');
  expect(screen.getAllByRole('article')).toHaveLength(10);
  await user.selectOptions(screen.getByLabelText('Quiz category'), 'science');
  expect(screen.getAllByRole('article')).toHaveLength(1);
  await user.type(screen.getByLabelText('Search quizzes'), 'unmatched');
  expect(screen.getByText('No quizzes here just yet')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'View all quizzes' }));
  expect(screen.getAllByRole('article')).toHaveLength(30);
});
test('favoriting updates the favorites tab immediately', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  await screen.findByText('30 quizzes in your library');
  await user.click(screen.getByRole('button', { name: 'Favorite Everyday knowledge: The essentials', exact: true }));
  await user.click(screen.getByRole('button', { name: /Favorites/ }));
  expect(screen.getAllByRole('article')).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Unfavorite Everyday knowledge: The essentials', exact: true }));
  expect(await screen.findByText('No quizzes here just yet')).toBeTruthy();
});
test('preview exposes real diagrams and answer keys', async () => {
  HTMLDialogElement.prototype.showModal = function() { this.setAttribute('open',''); };
  HTMLDialogElement.prototype.close = function() { this.removeAttribute('open'); };
  const user = userEvent.setup();
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  await screen.findByText('30 quizzes in your library');
  await user.click(screen.getByRole('button', { name: 'Preview Everyday knowledge: Chart challenge' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getAllByRole('img')).toHaveLength(2);
  expect(within(dialog).getAllByText('Show answers')).toHaveLength(17);
  await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});
