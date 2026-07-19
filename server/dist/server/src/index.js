"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const db_1 = require("./db");
const auth_1 = __importDefault(require("./routes/auth"));
const quizzes_1 = __importDefault(require("./routes/quizzes"));
const games_1 = __importDefault(require("./routes/games"));
const discover_1 = __importDefault(require("./routes/discover"));
const reports_1 = __importDefault(require("./routes/reports"));
const groups_1 = __importDefault(require("./routes/groups"));
const learning_1 = __importDefault(require("./routes/learning"));
const folders_1 = __importDefault(require("./routes/folders"));
const gameSocket_1 = require("./socket/gameSocket");
dotenv_1.default.config();
const PORT = process.env.PORT || 3001;
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
    },
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/quizzes', quizzes_1.default);
app.use('/api/games', games_1.default);
app.use('/api/discover', discover_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/groups', groups_1.default);
app.use('/api/learning', learning_1.default);
app.use('/api/folders', folders_1.default);
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
(0, db_1.connectDb)().then(() => {
    (0, gameSocket_1.setupGameSocket)(io);
    process.on('SIGINT', () => { (0, db_1.disconnectDb)().then(() => process.exit(0)); });
    process.on('SIGTERM', () => { (0, db_1.disconnectDb)().then(() => process.exit(0)); });
    httpServer.listen(PORT, () => {
        console.log(`AnimPlay server running on http://localhost:${PORT}`);
    });
});
//# sourceMappingURL=index.js.map