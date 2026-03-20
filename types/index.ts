export type CardSetType = 'fibonacci' | 'tshirt' | 'powers2' | 'freetext';

export const CARD_SETS: Record<Exclude<CardSetType, 'freetext'>, string[]> = {
  fibonacci: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'],
  tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  powers2: ['1', '2', '4', '8', '16', '32', '64', '?'],
};

export const CARD_SET_LABELS: Record<CardSetType, string> = {
  fibonacci: 'Fibonacci',
  tshirt: 'T-Shirt Sizes',
  powers2: 'Powers of 2',
  freetext: 'Free Input',
};

export type Role = 'moderator' | 'voter' | 'observer';
export type RoomPhase = 'waiting' | 'voting' | 'revealed';

export interface Participant {
  id: string;
  name: string;
  role: Role;
  isOnline: boolean;
  hasVoted: boolean;
}

export interface Room {
  id: string;
  cardSet: CardSetType;
  allowCustom: boolean;  // show freetext input alongside the selected card deck
  autoReveal: boolean;   // auto-reveal when all voters have voted (default: true)
  allowVoteChange: boolean; // voters can change their answer after submitting (default: true)
  topic: string;
  createdAt: string;
  lastActivityAt: string;
  participants: Participant[];
  phase: RoomPhase;
  votes: Record<string, string>;
  timer?: { duration: number; startedAt: string } | null;
}

export interface JwtPayload {
  participantId: string;
  name: string;
  role: Role;
  roomId: string;
  iat?: number;
  exp?: number;
}

export type ServerToClientEvents = {
  'room:state': (room: Room) => void;
  'room:update': (patch: Partial<Room>) => void;
  'participant:joined': (participant: Participant) => void;
  'participant:left': (participantId: string) => void;
  'participant:voted': (participantId: string) => void;
  'votes:revealed': (votes: Record<string, string>) => void;
  'votes:reset': () => void;
  'timer:tick': (remaining: number) => void;
  'token:updated': (token: string) => void;
  'error': (payload: { code: string; message: string }) => void;
};

export type ClientToServerEvents = {
  'vote:cast': (value: string) => void;
  'vote:reveal': () => void;
  'vote:reset': () => void;
  'topic:set': (topic: string) => void;
  'cardset:change': (cardSet: CardSetType) => void;
  'allowcustom:set': (value: boolean) => void;
  'autoreveal:set': (value: boolean) => void;
  'votechange:set': (value: boolean) => void;
  'timer:start': (duration: number) => void;
  'role:transfer': (participantId: string) => void;
  'moderator:claim': () => void;
};
