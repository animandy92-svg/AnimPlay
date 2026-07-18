import { Server as SocketServer } from 'socket.io';
import type { GameRoom } from '../../../shared/types';
export declare function getGameByPin(pin: string): GameRoom | undefined;
export declare function setupGameSocket(io: SocketServer): void;
//# sourceMappingURL=gameSocket.d.ts.map