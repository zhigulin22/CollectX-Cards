// Upload routes for images
import { Router } from 'express';
import { genId } from '../db/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Upload image (base64)
router.post('/image', (req, res) => {
  try {
    const { image, type = 'card' } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Image data required' });
    }
    
    // Extract base64 data
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format. Use base64.' });
    }
    
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    
    // Validate size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large. Max 5MB.' });
    }
    
    // Generate filename and save
    const filename = `${type}_${genId()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(filepath, buffer);
    
    const url = `/uploads/${filename}`;
    
    res.json({ 
      success: true, 
      url,
      filename 
    });
    
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Delete image
router.delete('/:filename', (req, res) => {
  try {
    const filepath = path.join(uploadsDir, req.params.filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;

