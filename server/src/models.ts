import mongoose, { Schema, Document } from 'mongoose';

export interface IHost extends Document {
  id: number;
  username: string;
  email: string;
  password?: string;
  provider?: string;
  googleId?: string;
  created_at: Date;
}

export interface IQuiz extends Document {
  id: number;
  hostId: number;
  title: string;
  description: string;
  coverImage: string | null;
  isPublic: boolean;
  category: string;
  playCount: number;
  status: string;
  isFavorite: boolean;
  folderId: number | null;
  deletedAt: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IQuestion extends Document {
  id: number;
  quizId: number;
  questionText: string;
  imageUrl: string | null;
  timerSeconds: number;
  points: number;
  pointsMultiplier: number;
  sortOrder: number;
  correctIndex: number;
  questionType: 'multiple_choice' | 'true_false' | 'open_ended';
}

export interface IAnswer extends Document {
  id: number;
  questionId: number;
  sortIndex: number;
  text: string;
  color: string;
}

export interface IGame extends Document {
  id: number;
  gamePin: string;
  quizId: number;
  hostId: number;
  status: string;
  currentQuestion: number;
  startedAt: Date | null;
  endedAt: Date | null;
  created_at: Date;
}

export interface IGameResult extends Document {
  id: number;
  gameId: number;
  nickname: string;
  score: number;
  correct: number;
  total: number;
  streak: number;
  rank: number;
}

export interface IFolder extends Document {
  id: number;
  hostId: number;
  name: string;
}

export interface IGroup extends Document {
  id: number;
  ownerId: number;
  name: string;
  description: string;
  inviteCode: string;
  created_at: Date;
}

export interface IGroupMember extends Document {
  id: number;
  groupId: number;
  hostId: number;
  role: string;
  joined_at: Date;
}

export interface IAssignment extends Document {
  id: number;
  groupId: number;
  quizId: number;
  title: string;
  dueDate: Date | null;
  createdBy: number;
  created_at: Date;
}

export interface IAssignmentCompletion extends Document {
  id: number;
  assignmentId: number;
  hostId: number;
  completedAt: Date | null;
  score: number;
}

export interface ITeam extends Document {
  id: number;
  gameId: number;
  name: string;
  color: string;
  score: number;
}

export interface ITeamMember extends Document {
  id: number;
  teamId: number;
  gameId: number;
  playerId: string;
  nickname: string;
}

export interface IPowerUp extends Document {
  id: number;
  name: string;
  description: string;
  icon: string;
  cost: number;
}

export interface IPlayerPowerUp extends Document {
  id: number;
  gameId: number;
  playerId: string;
  powerUpId: number;
  used: boolean;
}

export interface IChatMessage extends Document {
  id: number;
  gameId: number;
  playerId: string;
  nickname: string;
  message: string;
  type: 'chat' | 'reaction';
  createdAt: Date;
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
  password: { type: String },
  provider: { type: String, default: 'local' },
  googleId: { type: String, unique: true, sparse: true },
  created_at: { type: Date, default: Date.now },
});

const quizSchema = new Schema<IQuiz>({
  id: { type: Number, unique: true },
  hostId: { type: Number, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  coverImage: { type: String, default: null },
  isPublic: { type: Boolean, default: true },
  category: { type: String, default: 'general' },
  playCount: { type: Number, default: 0 },
  status: { type: String, default: 'published' },
  isFavorite: { type: Boolean, default: false },
  folderId: { type: Number, default: null, index: true },
  deletedAt: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const questionSchema = new Schema<IQuestion>({
  id: { type: Number, unique: true },
  quizId: { type: Number, required: true, index: true },
  questionText: { type: String, required: true },
  imageUrl: { type: String, default: null },
  timerSeconds: { type: Number, default: 20 },
  points: { type: Number, default: 1000 },
  pointsMultiplier: { type: Number, default: 1.0 },
  sortOrder: { type: Number, required: true },
  correctIndex: { type: Number, required: true },
  questionType: { type: String, enum: ['multiple_choice', 'true_false', 'open_ended'], default: 'multiple_choice' },
});

const answerSchema = new Schema<IAnswer>({
  id: { type: Number, unique: true },
  questionId: { type: Number, required: true, index: true },
  sortIndex: { type: Number, required: true },
  text: { type: String, required: true },
  color: { type: String, default: 'red' },
});

const gameSchema = new Schema<IGame>({
  id: { type: Number, unique: true },
  gamePin: { type: String, required: true, unique: true },
  quizId: { type: Number, required: true, index: true },
  hostId: { type: Number, required: true, index: true },
  status: { type: String, default: 'lobby' },
  currentQuestion: { type: Number, default: 0 },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
});

const gameResultSchema = new Schema<IGameResult>({
  id: { type: Number, unique: true },
  gameId: { type: Number, required: true, index: true },
  nickname: { type: String, required: true },
  score: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
});

const folderSchema = new Schema<IFolder>({
  id: { type: Number, unique: true },
  hostId: { type: Number, required: true, index: true },
  name: { type: String, required: true },
});

const groupSchema = new Schema<IGroup>({
  id: { type: Number, unique: true },
  ownerId: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  inviteCode: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now },
});

const groupMemberSchema = new Schema<IGroupMember>({
  id: { type: Number, unique: true },
  groupId: { type: Number, required: true, index: true },
  hostId: { type: Number, required: true, index: true },
  role: { type: String, default: 'member' },
  joined_at: { type: Date, default: Date.now },
});

const assignmentSchema = new Schema<IAssignment>({
  id: { type: Number, unique: true },
  groupId: { type: Number, required: true, index: true },
  quizId: { type: Number, required: true, index: true },
  title: { type: String, required: true },
  dueDate: { type: Date, default: null },
  createdBy: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
});

const assignmentCompletionSchema = new Schema<IAssignmentCompletion>({
  id: { type: Number, unique: true },
  assignmentId: { type: Number, required: true, index: true },
  hostId: { type: Number, required: true, index: true },
  completedAt: { type: Date, default: null },
  score: { type: Number, default: 0 },
});

const teamSchema = new Schema<ITeam>({
  id: { type: Number, unique: true },
  gameId: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  color: { type: String, required: true },
  score: { type: Number, default: 0 },
});

const teamMemberSchema = new Schema<ITeamMember>({
  id: { type: Number, unique: true },
  teamId: { type: Number, required: true, index: true },
  gameId: { type: Number, required: true, index: true },
  playerId: { type: String, required: true },
  nickname: { type: String, required: true },
});

const powerUpSchema = new Schema<IPowerUp>({
  id: { type: Number, unique: true },
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  cost: { type: Number, required: true },
});

const playerPowerUpSchema = new Schema<IPlayerPowerUp>({
  id: { type: Number, unique: true },
  gameId: { type: Number, required: true, index: true },
  playerId: { type: String, required: true, index: true },
  powerUpId: { type: Number, required: true },
  used: { type: Boolean, default: false },
});

const chatMessageSchema = new Schema<IChatMessage>({
  id: { type: Number, unique: true },
  gameId: { type: Number, required: true, index: true },
  playerId: { type: String, required: true },
  nickname: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['chat', 'reaction'], default: 'chat' },
  createdAt: { type: Date, default: Date.now },
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
export const Team = mongoose.model<ITeam>('Team', teamSchema);
export const TeamMember = mongoose.model<ITeamMember>('TeamMember', teamMemberSchema);
export const PowerUp = mongoose.model<IPowerUp>('PowerUp', powerUpSchema);
export const PlayerPowerUp = mongoose.model<IPlayerPowerUp>('PlayerPowerUp', playerPowerUpSchema);
export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);

export { mongoose };
export default mongoose;
