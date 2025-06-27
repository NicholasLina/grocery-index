"use strict";
/**
 * Main Express application for the Canadian Grocery Index API
 *
 * This application provides a REST API for accessing StatCan grocery price data.
 * It connects to MongoDB and provides endpoints for querying price data by various criteria.
 *
 * @author Canadian Grocery Index Team
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const statcan_1 = __importDefault(require("./routes/statcan"));
/** Express application instance */
const app = (0, express_1.default)();
/** Port number for the server (defaults to 3000) */
const PORT = process.env.PORT || 3000;
// Middleware configuration
app.use((0, cors_1.default)()); // Enable CORS for all routes
app.use(express_1.default.json()); // Parse JSON request bodies
/**
 * MongoDB connection configuration
 * Connects to the local MongoDB instance with the 'statcan' database
 */
mongoose_1.default.connect('mongodb://localhost:27017/statcan', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err));
// API Routes
app.use('/api/statcan', statcan_1.default);
/**
 * Start the Express server
 * Logs the port number when the server starts successfully
 */
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api/statcan`);
});
