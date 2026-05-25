import express from 'express';
import { getNotes, createNote, deleteNote } from '../controllers/noteController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/:leadId', getNotes);
router.post('/:leadId', createNote);
router.delete('/item/:id', deleteNote);

export default router;
