"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGamePin = generateGamePin;
function generateGamePin() {
    const min = 100000;
    const max = 999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
}
//# sourceMappingURL=pin.js.map