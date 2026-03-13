const path = require('path');
const serverless = require('serverless-http');
const dotenv = require('dotenv');

// Load local env when running `vercel dev`; on Vercel, dashboard env vars are used.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = require('../src/app');

module.exports = serverless(app);
