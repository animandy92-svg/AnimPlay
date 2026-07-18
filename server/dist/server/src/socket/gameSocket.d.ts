import { Server as SocketServer } from 'socket.io';
import type { GameRoom, Player } from '../../../shared/types';
type ServerPlayer = Player & {
    disconnectTimeout?: ReturnType<typeof setTimeout>;
};
type ServerGameRoom = Omit<GameRoom, 'players'> & {
    players: Map<string, ServerPlayer>;
};
export declare function getGameByPin(pin: string): ServerGameRoom | undefined;
export declare function setupGameSocket(io: SocketServer): void;
export {};
//# sourceMappingURL=gameSocket.d.ts.map