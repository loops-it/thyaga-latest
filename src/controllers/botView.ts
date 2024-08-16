// routes/index.ts
import express, { Request, Response } from 'express';
import QuickQuestion from '../../models/QuickQuestion';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const router = express.Router();

router.get('/bot', async (req: Request, res: Response) => {
    const questions  = await prisma.quickQuestion.findFirst({});
    res.render('bot',{questions: questions});
});

export default router;
