import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { put } from '@vercel/blob';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const agentCreateAccount = async (req: Request, res: Response) => {
  const { name, phone, email, password, language } = req.body;

  try {
    const emailExist = await prisma.user.findFirst({ where: { email } });

    if (emailExist) {
      return res.status(400).json({ status: "failed", message: "Email is already registered" });
    }

    const cryptPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: cryptPassword,
        user_role: 2,
        status: "active",
      },
    });

    await prisma.agent.create({
      data: {
        user_id: user.id,
        name,
        phone,
        status: "active",
        profile_picture: "agent.png",
      },
    });

    const languagesArray = language.split(',');

    for (const lang of languagesArray) {
      await prisma.agentLanguages.create({
        data: {
          user_id: user.id,
          language: lang,
        },
      });
    }

    return res.status(201).json({ status: "success", message: "Agent Added" });

  } catch (error) {
    // return res.status(500).json({ status: "failed", message: `Error: ${error.message}` });
  }
};

export const agentUpdateAccount = async (req: Request, res: Response) => {
    const { name, phone, email, language } = req.body;
    
    // Ensure language is a string and split it, or default to an empty array if it's not valid
    const languagesArray = typeof language === 'string' ? language.split(',') : [];
  
    const user_id = parseInt(req.body.user_id as string, 10);
  
    try {
      const emailExist = await prisma.user.findFirst({ where: { email } });
  
      if (emailExist && emailExist.id !== user_id) {
        return res.status(400).json({ status: "failed", message: "Email is already registered" });
      }
  
      let profile_picture;
  
      if (req.file) {
        const file = req.file;
        const blob = await put(file.originalname, file.buffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
        profile_picture = blob.url;
      }
  
      await prisma.agent.updateMany({
        where: { user_id },
        data: { name, phone, ...(profile_picture && { profile_picture }) },
      });
  
      await prisma.user.updateMany({
        where: { id: user_id },
        data: { email },
      });
  

      if (languagesArray.length > 0) {
        await prisma.agentLanguages.deleteMany({ where: { user_id } });
  
        for (const lang of languagesArray) {
          await prisma.agentLanguages.create({
            data: {
              user_id,
              language: lang,
            },
          });
        }
      }
  
      return res.status(200).json({ status: "success", message: "Agent Updated" });
  
    } catch (error) {
    //   return res.status(500).json({ status: "failed", message: `Error: ${error.message}` });
    }
  };
  
export const agentUpdateWithPassword = async (req: Request, res: Response) => {
  const { name, phone, email, password, language } = req.body;
  const user_id = parseInt(req.body.user_id, 10);
  const languagesArray = language.split(',');
  const cryptPassword = await bcrypt.hash(password, 10);

  try {
    const emailExist = await prisma.user.findFirst({ where: { email } });

    if (emailExist && emailExist.id !== user_id) {
      return res.status(400).json({ status: "failed", message: "Email is already registered" });
    }

    let profile_picture;

    if (req.file) {
      const file = req.file;
      const blob = await put(file.originalname, file.buffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
      profile_picture = blob.url;
    }

    await prisma.agent.updateMany({
      where: { user_id },
      data: { name, phone, ...(profile_picture && { profile_picture }) },
    });

    await prisma.user.updateMany({
      where: { id: user_id },
      data: { email, password: cryptPassword },
    });

    await prisma.agentLanguages.deleteMany({ where: { user_id } });

    for (const lang of languagesArray) {
      await prisma.agentLanguages.create({
        data: {
          user_id,
          language: lang,
        },
      });
    }

    return res.status(200).json({ status: "success", message: "Agent Updated" });

  } catch (error) {
    // return res.status(500).json({ status: "failed", message: `Error: ${error.message}` });
  }
};
