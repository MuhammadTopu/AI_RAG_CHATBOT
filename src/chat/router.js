import express from 'express';
import { chat } from './chat.js';

const router = express.Router();

router.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'Question is required' 
      });
    }

    const response = await chat(question);

    res.json({ 
      success: true, 
      response 
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process chat request', 
      details: error.message 
    });
  }
});

export default router;
