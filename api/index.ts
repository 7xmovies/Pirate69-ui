import express from 'express';
import apiRouter from '../server/api.js';

const app = express();

// Add JSON body parsing middleware
app.use(express.json());

// Use extracted API routes
app.use('/api', apiRouter);

// Export the Express API for Vercel
export default app;
