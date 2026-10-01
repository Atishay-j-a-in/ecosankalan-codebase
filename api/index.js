/**
 * api/index.js
 * Vercel serverless entry — the local dev entry stays src/server.js.
 *
 * Serverless functions must export a handler; they cannot call app.listen().
 * DB connects once per warm instance and is reused across invocations.
 */

const app = require('../src/app');
const connectDB = require('../src/config/database');

let ready = null;

module.exports = async (req, res) => {
  try {
    if (!ready) {
      ready = connectDB().catch((err) => {
        ready = null;
        throw err;
      });
    }
    await ready;
  } catch (err) {
    // DB down — fail fast instead of hanging until function timeout.
    res.status(503).json({ success: false, message: 'Database unavailable. Try again shortly.' });
    return;
  }
  return app(req, res);
};
