import mongoose, { Schema, Document } from 'mongoose';

export interface IHost extends Document {
  id: number;
  username: string;
  email: string;
  password: string;
  created_at: Date;
}

export interface IQuiz extends Document {
  id: number;
  host_id: number;
  title: string;
  description: string;
  cover_image: string | null;
  is_public: boolean;
  category: string;
  play_count: number;
  status: string;
  is_favorite: boolean;
  folder_id: number | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IQuestion extends Document {
  id: number;
  quiz_id: number;
  question_text: string;
  image_url: string | null;
  timer_seconds: number;
  points: number;
  points_multiplier: number;
  sort_order: number;
  correct_index: number;
}

export interface IAnswer extends Document {
  id: number;
  question_id: number;
  sort_index: number;
  text: string;
  color: string;
}

export interface IGame extends Document {
  id: number;
  game_pin: string;
  quiz_id: number;
  host_id: number;
  status: string;
  current_question: number;
  started_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
}

export interface IGameResult extends Document {
  id: number;
  game_id: number;
  nickname: string;
  score: number;
  correct: number;
  total: number;
  streak: number;
  rank: number;
}

export interface IFolder extends Document {
  id: number;
  host_id: number;
  name: string;
}

export interface IGroup extends Document {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  invite_code: string;
  created_at: Date;
}

export interface IGroupMember extends Document {
  id: number;
  group_id: number;
  host_id: number;
  role: string;
  joined_at: Date;
}

export interface IAssignment extends Document {
  id: number;
  group_id: number;
  quiz_id: number;
  title: string;
  due_date: Date | null;
  created_by: number;
  created_at: Date;
}

export interface IAssignmentCompletion extends Document {
  id: number;
  assignment_id: number;
  host_id: number;
  completed_at: Date | null;
  score: number;
}

interface ICounter extends Document {
  name: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model<ICounter>('Counter', counterSchema);

export async function nextId(name: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

const hostSchema = new Schema<IHost>({
  id: { type: Number, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const quizSchema = new Schema<IQuiz>({
  id: { type: Number, unique: true },
  host_id: { type: Number, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  cover_image: { type: String, default: null },
  is_public: { type: Boolean, default: true },
  category: { type: String, default: 'general' },
  play_count: { type: Number, default: 0 },
  status: { type: String, default: 'published' },
  is_favorite: { type: Boolean, default: false },
  folder_id: { type: Number, default: null, index: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const questionSchema = new Schema<IQuestion>({
  id: { type: Number, unique: true },
  quiz_id: { type: Number, required: true, index: true },
  question_text: { type: String, required: true },
  image_url: { type: String, default: null },
  timer_seconds: { type: Number, default: 20 },
  points: { type: Number, default: 1000 },
  points_multiplier: { type: Number, default: 1.0 },
  sort_order: { type: Number, required: true },
  correct_index: { type: Number, required: true },
});

const answerSchema = new Schema<IAnswer>({
  id: { type: Number, unique: true },
  question_id: { type: Number, required: true, index: true },
  sort_index: { type: Number, required: true },
  text: { type: String, required: true },
  color: { type: String, default: 'red' },
});

const gameSchema = new Schema<IGame>({
  id: { type: Number, unique: true },
  game_pin: { type: String, required: true, unique: true },
  quiz_id: { type: Number, required: true, index: true },
  host_id: { type: Number, required: true, index: true },
  status: { type: String, default: 'lobby' },
  current_question: { type: Number, default: 0 },
  started_at: { type: Date, default: null },
  ended_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
});

const gameResultSchema = new Schema<IGameResult>({
  id: { type: Number, unique: true },
  game_id: { type: Number, required: true, index: true },
  nickname: { type: String, required: true },
  score: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
});

const folderSchema = new Schema<IFolder>({
  id: { type: Number, unique: true },
  host_id: { type: Number, required: true, index: true },
  name: { type: String, required: true },
});

const groupSchema = new Schema<IGroup>({
  id: { type: Number, unique: true },
  owner_id: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  invite_code: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now },
});

const groupMemberSchema = new Schema<IGroupMember>({
  id: { type: Number, unique: true },
  group_id: { type: Number, required: true, index: true },
  host_id: { type: Number, required: true, index: true },
  role: { type: String, default: 'member' },
  joined_at: { type: Date, default: Date.now },
});

const assignmentSchema = new Schema<IAssignment>({
  id: { type: Number, unique: true },
  group_id: { type: Number, required: true, index: true },
  quiz_id: { type: Number, required: true, index: true },
  title: { type: String, required: true },
  due_date: { type: Date, default: null },
  created_by: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
});

const assignmentCompletionSchema = new Schema<IAssignmentCompletion>({
  id: { type: Number, unique: true },
  assignment_id: { type: Number, required: true, index: true },
  host_id: { type: Number, required: true, index: true },
  completed_at: { type: Date, default: null },
  score: { type: Number, default: 0 },
});

export const Host = mongoose.model<IHost>('Host', hostSchema);
export const Quiz = mongoose.model<IQuiz>('Quiz', quizSchema);
export const Question = mongoose.model<IQuestion>('Question', questionSchema);
export const Answer = mongoose.model<IAnswer>('Answer', answerSchema);
export const Game = mongoose.model<IGame>('Game', gameSchema);
export const GameResult = mongoose.model<IGameResult>('GameResult', gameResultSchema);
export const Folder = mongoose.model<IFolder>('Folder', folderSchema);
export const Group = mongoose.model<IGroup>('Group', groupSchema);
export const GroupMember = mongoose.model<IGroupMember>('GroupMember', groupMemberSchema);
export const Assignment = mongoose.model<IAssignment>('Assignment', assignmentSchema);
export const AssignmentCompletion = mongoose.model<IAssignmentCompletion>(
  'AssignmentCompletion',
  assignmentCompletionSchema
);

export type {
  IHost,
  IQuiz,
  IQuestion,
  IAnswer,
  IGame,
  IGameResult,
  IFolder,
  IGroup,
  IGroupMember,
  IAssignment,
  IAssignmentCompletion,
};

export { mongoose };
export default mongoose;
