import OpenAI from "openai";
import { Request, Response } from 'express';
import { Pinecone } from '@pinecone-database/pinecone';
import "dotenv/config";
import File from '../../models/File';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

if (!process.env.PINECONE_API_KEY || typeof process.env.PINECONE_API_KEY !== 'string') {
    throw new Error('Pinecone API key is not defined or is not a string.');
}
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

export const deleteDocument = async (req: Request, res: Response) => {
    const id = req.query.id;
    const index = pc.index("botdb")
    const ns = index.namespace('thyaga-data')
    await ns.deleteOne(`${id}`);

    const row = await prisma.file.deleteMany({ where: { file_id: req.query.id }, }); 
    if (row) { 
        await row.destroy(); 
    }

    res.redirect('view-documents');
    
};
