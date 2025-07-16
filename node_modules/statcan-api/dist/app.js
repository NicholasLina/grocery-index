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
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
/** Express application instance */
const app = (0, express_1.default)();
// Load environment variables
dotenv_1.default.config();
// Use helmet for security headers
app.use((0, helmet_1.default)());
// Use morgan for logging
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
/** Port number for the server (defaults to 3000) */
const PORT = process.env.PORT || 3000;
// Middleware configuration
const allowedOrigins = [
    'https://groceryindex.nicklina.com'
];
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true
}));
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
// Health check endpoint
app.get('/health', (req, res) => res.send('OK'));
// Centralized error handler
app.use((err, req, res, next) => {
    console.error(err);
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ error: 'Internal Server Error' });
    }
    else {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});
/**
 * Start the Express server
 * Logs the port number when the server starts successfully
 */
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api/statcan`);
});
