import serverless from 'serverless-http';
import express from 'express';
import apiRouter from '../../server/api.js';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

export const handler = serverless(app);
