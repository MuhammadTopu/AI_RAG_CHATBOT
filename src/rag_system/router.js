import express from 'express';
import upload from '../../config/Multer.Config.js';
import { indexTheDocs , clearVectorStore} from './ragSystem.js';

const router = express.Router();

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded or file type not supported'
      });
    }

    const filePath = req.file.path;
    const result = await indexTheDocs(filePath);

    res.json({
      success: true,
      message: 'File uploaded and indexed successfully',
      filename: req.file.originalname,
      chunks: result.chunks
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process file',
      details: error.message
    });
  }
});

router.delete("/cleardb", async (req, res) => {
  try {
    await clearVectorStore();
    res.status(200).json({ message: "Vector store cleared successfully." });
  } catch (error) {
    console.error("Error clearing vector store:", error);
    res.status(500).json({ error: "Failed to clear vector store." });
  }
});

export default router;
