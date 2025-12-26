// Vercel Serverless Function Entry Point
// This file exports the Express app as a Vercel-compatible handler

const app = require('../backend/server');

// Vercel expects a function that receives (req, res)
// Express app is already a function, so we can export it directly
module.exports = app;

