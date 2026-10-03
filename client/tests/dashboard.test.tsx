import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QUIZ_CATEGORIES, QUIZ_LIBRARY } from '../src/data/library';
import { api } from '../src/services/api';
import Dashboard from '../src/pages/Dashboard';
vi.mock('../src/services/api', () => ({ api: {
  quizzes: { list: async (tab: string) => ({ quizzes: tab === 'trash' ? [] : QUIZ_LIBRARY.map(q => ({ ...q, question_count: q.questions.length, is_favorite: 0, deleted_at: null, created_at: '2026-09-29', updated_at: '2026-09-29' })) }), update: vi.fn().mockResolvedValue({}), aiGenerate: vi.fn().mockResolvedValue({ quiz: { id: 42 } }) },
  folders: { list: async () => ({ folders: [] }) },
} }));
afterEach(cleanup);
test('shows the eight easy quizzes and combines search, subject and format filters', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  await screen.findByText('8 quizzes in your library');
  expect(screen.queryByText('Load Sample Quiz')).toBeNull();
  await user.selectOptions(screen.getByLabelText('Question format'), 'image');
  expect(screen.getAllByRole('article')).toHaveLength(3);
  await user.selectOptions(screen.getByLabelText('Quiz category'), 'animals');
  expect(screen.getAllByRole('article')).toHaveLength(1);
  await user.type(screen.getByLabelText('Search quizzes'), 'unmatched');
  expect(screen.getByText('No quizzes here just yet')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'View all quizzes' }));
  expect(screen.getAllByRole('article')).toHaveLength(8);
});
test('favoriting updates the favorites tab immediately', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  await screen.findByText('8 quizzes in your library');
  await user.click(screen.getByRole('button', { name: 'Favorite Everyday General Knowledge', exact: true }));
  await user.click(screen.getByRole('button', { name: /Favorites/ }));
  expect(screen.getAllByRole('article')).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Unfavorite Everyday General Knowledge', exact: true }));
  expect(await screen.findByText('No quizzes here just yet')).toBeTruthy();
});
test('preview exposes animal pictures and answer keys', async () => {
  HTMLDialogElement.prototype.showModal = function() { this.setAttribute('open',''); };
  HTMLDialogElement.prototype.close = function() { this.removeAttribute('open'); };
  const user = userEvent.setup();
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  await screen.findByText('8 quizzes in your library');
  await user.click(screen.getByRole('button', { name: 'Preview Animal Pictures' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getAllByRole('img')).toHaveLength(15);
  expect(within(dialog).getAllByText('Show answers')).toHaveLength(15);
  await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('builder selects one named topic and sends only that topic to generation', async () => {
  HTMLDialogElement.prototype.showModal = function() { this.setAttribute('open',''); };
  HTMLDialogElement.prototype.close = function() { this.removeAttribute('open'); };
  const user = userEvent.setup();
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  await screen.findByText('8 quizzes in your library');
  await user.click(screen.getByRole('button', { name: /Quick-start builder/ }));
  const dialog = within(screen.getByRole('dialog'));
  const topic = dialog.getByLabelText('Topic');
  expect(topic.tagName).toBe('SELECT');
  expect(within(topic).getAllByRole('option').map(option => option.textContent)).toEqual(Object.values(QUIZ_CATEGORIES));
  await user.selectOptions(topic, 'bible-characters');
  await user.selectOptions(dialog.getByLabelText('Questions'), '10');
  await user.click(dialog.getByRole('button', { name: 'Build easy quiz' }));
  expect(api.quizzes.aiGenerate).toHaveBeenCalledWith('bible-characters', 'Everyone', 10);
});
