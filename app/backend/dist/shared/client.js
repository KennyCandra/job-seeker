"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
const llm_1 = require("./llm");
function createClient(config) {
    if (config) {
        return llm_1.OpenCodeClient.fromConfig(config);
    }
    return new llm_1.OpenCodeClient();
}
//# sourceMappingURL=client.js.map