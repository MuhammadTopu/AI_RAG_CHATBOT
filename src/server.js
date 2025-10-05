import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { indexTheDocs } from './rag_system/ragSystem.js';
import { chat } from './chat/chat.js';
import chatRoute from './chat/router.js';
import ragRoute from './rag_system/router.js';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express(); 
const port = process.env.PORT || 3000;

// CORS middleware - place this first
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware 
app.use(express.json({}));
app.use(express.urlencoded({ extended: true}));
app.use(express.static('public'));

// Routes
app.use('/api', chatRoute);
app.use('/api', ragRoute);
// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'RAG API is running',
    timestamp: new Date().toISOString()
  });
});
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});