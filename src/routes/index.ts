// routes/index.ts
import express, { Request, Response } from 'express';
import QuickQuestion from '../../models/QuickQuestion';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
    res.render('index');
});

router.get('/bot', async (req: Request, res: Response) => {
    const questions  = await QuickQuestion.findAll({});
    res.render('bot',{questions: questions});
});

router.get('/voice-bot', async (req: Request, res: Response) => {
    const questions  = await QuickQuestion.findAll({});
    res.render('audioBot',{questions: questions});
});

router.get('/live-agent', (req: Request, res: Response) => {
    res.render('liveAgent');
});

router.get('/voice-and-chat-bot', async (req: Request, res: Response) => {
    const questions  = await QuickQuestion.findAll({});
    res.render('intergratedBot',{questions: questions});
});

// router.get('/bot-customization', async (req: Request, res: Response) => {
//     res.render('customization');
// });

router.get('/voice-call', async (req: Request, res: Response) => {
    const questions  = await QuickQuestion.findAll({});
    res.render('IntergratedBotCall',{questions: questions});
});

export default router;
