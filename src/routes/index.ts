// routes/index.ts
import express, { Request, Response } from 'express';
import QuickQuestion from '../../models/QuickQuestion';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();


router.get('/', (req: Request, res: Response) => {
    res.render('index');
});

router.get('/bot', async (req: Request, res: Response) => {
    const questions = await prisma.quickQuestion.findMany();
    res.render('bot', { questions });
});

router.get('/voice-bot', async (req: Request, res: Response) => {
    const questions = await prisma.quickQuestion.findMany();
    res.render('audioBot', { questions });
});

router.get('/live-agent', (req: Request, res: Response) => {
    res.render('liveAgent');
});

router.get('/voice-and-chat-bot', async (req: Request, res: Response) => {
    const questions = await prisma.quickQuestion.findMany();
    res.render('intergratedBot', { questions });
});

// router.get('/bot-customization', async (req: Request, res: Response) => {
//     res.render('customization');
// });

router.get('/voice-call', async (req: Request, res: Response) => {
    const questions = await prisma.quickQuestion.findMany();
    res.render('IntergratedBotCall', { questions });
});

export default router;