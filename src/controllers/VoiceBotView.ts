// routes/index.ts
import express, { Request, Response } from 'express';
import QuickQuestion from '../../models/QuickQuestion';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const router = express.Router();

router.get('/voice-bot', async (req: Request, res: Response) => {
    const questions  = await prisma.quickQuestion.findFirst({});
    res.render('audioBot',{questions: questions});
});

export default router;
