import app from './app';

/** Port number for the server (defaults to 3000) */
const PORT = process.env.PORT || 3000;

/**
 * Start the Express server
 * Logs the port number when the server starts successfully
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api/statcan`);
});
