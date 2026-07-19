"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REACTIONS = exports.POWER_UPS = exports.QUESTION_TYPES = exports.ANSWER_SHAPES = exports.ANSWER_COLORS = void 0;
exports.ANSWER_COLORS = ['red', 'blue', 'yellow', 'green'];
exports.ANSWER_SHAPES = ['triangle', 'diamond', 'circle', 'square'];
exports.QUESTION_TYPES = ['multiple_choice', 'true_false', 'open_ended'];
exports.POWER_UPS = [
    { id: 1, name: 'double_points', description: 'Double points for next correct answer', icon: '2x', cost: 500 },
    { id: 2, name: 'remove_one', description: 'Remove one wrong answer', icon: '-1', cost: 300 },
    { id: 3, name: 'time_freeze', description: 'Pause timer for 3 seconds', icon: '⏸', cost: 400 },
];
exports.REACTIONS = ['👍', '❤️', '😂', '😮', '👏', '🔥'];
//# sourceMappingURL=types.js.map