import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../../models/User';
import Agent from '../../models/Agent';
import AgentLanguages from '../../models/AgentLanguages';
import { put } from '@vercel/blob';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
 

export const agentCreateAccount = async (req: Request, res: Response) => {
    const {name, phone, email, password, language} = req.body;
    console.log(req.body);
    try {
        const email_exist = await prisma.user.findFirst({
          where: {
          email : email,
          },
        });
      if(email_exist){

        return res.json({status:"failed", message:`Email has already registered`})
      }
      else{
          const crypt_password = await (bcrypt.hash(password, 10));
          let user = await prisma.user.create({
            data: {
              email: email,
              password: crypt_password,
              user_role: 2,
              status: "active",
            },
          });
          await prisma.agent.create({
            data: {
              user_id: user.id,
              name: name,
              phone:phone,
              status:"active",
              profile_picture:"agent.png",
            },
          });

          const languagesArray = language.split(',');
          for (const language of languagesArray) { 
            await prisma.agentLanguages.create({
              data: {
                user_id: user.id,
                language: language,
              },
            });
          }
            return res.json({status:"success", message:"Agent Added"})
      }
      } catch (error) {
        return res.json({status:"failed", message:`${error}`})
      }
};

export const agentUpdateAccount = async (req: Request, res: Response, next: Function) => {
  const {name, phone, email,language} = req.body
  const languagesArray = language.split(',');
  let user_id: number | undefined = parseInt(req.body.user_id as string, 10);
  try {
    const email_exist = await prisma.user.findFirst({
      where: { email: email },
    });
  if(email_exist){
      if(email_exist.id == user_id){
        if (req.file) {
          const file = req.file;
          const blob = await put(file.originalname, file.buffer, { access: 'public',token:process.env.BLOB_READ_WRITE_TOKEN });
          const profile_picture = blob.url
          await prisma.agent.updateMany({
            where: { user_id: user_id },
            data: { name: name,phone: phone, profile_picture : profile_picture},
          });
        }
        else{
          await prisma.agent.updateMany({
            where: { user_id: user_id },
            data: { name: name,phone: phone},
          });
        }
            await prisma.user.updateMany({
              where: { id: user_id },
              data: { email: email},
            });
          await prisma.agentLanguages.deleteMany({
              where: { user_id: user_id },
          });
    
            for (const language of languagesArray) {
              await prisma.agentLanguages.create({
                data: {
                  user_id: user_id,
                  language: language,
                },
              });
            }
            
          return res.json({status:"success", message:"Agent Updated"})
      }
      else{
          return res.json({status:"failed", message:"Email has already registered"})
      }    
  }
  else{
            if (req.file) {
              const file = req.file;
              const blob = await put(file.originalname, file.buffer, { access: 'public',token:process.env.BLOB_READ_WRITE_TOKEN });
              const profile_picture = blob.url
              await prisma.agent.updateMany({
                where: { user_id: user_id },
                data: { name: name,phone: phone, profile_picture : profile_picture},
              });
            }
            else{
              await prisma.agent.updateMany({
                where: { user_id: user_id },
                data: { name: name,phone: phone},
              });
            }

            await prisma.user.updateMany({
              where: { id: user_id },
              data: { email: email},
            });
          await prisma.agentLanguages.deleteMany({
              where: { user_id: user_id },
          });
          for (const language of languagesArray) {
            await prisma.agentLanguages.create({
              data: {
                user_id: user_id,
                language: language,
              },
            });
          }
      return res.json({status:"success", message:"Agent Updated"})
  }
  } catch (error) {
    return res.json({status:"failed", message:`${error}`})
  }
};

export const agentUpdateWithPassword = async (req: Request, res: Response, next: Function) => {
  const {name, phone, email, password,language} = req.body
  const languagesArray = language.split(',');
  let user_id: number | undefined = parseInt(req.body.user_id as string, 10);
  const crypt_password = await (bcrypt.hash(password, 10));
  try {
    const email_exist = await prisma.user.findFirst({
      where: { email: email },
    });
  if(email_exist){
      if(email_exist.id == user_id){
        if (req.file) {
          const file = req.file;
          const blob = await put(file.originalname, file.buffer, { access: 'public',token:process.env.BLOB_READ_WRITE_TOKEN });
          const profile_picture = blob.url
          await prisma.agent.updateMany({
            where: { user_id: user_id },
            data: { name: name,phone: phone, profile_picture : profile_picture},
          });
        }
        else{
          await prisma.agent.updateMany({
            where: { user_id: user_id },
            data: { name: name,phone: phone},
          });
        }
            await prisma.user.updateMany({
              where: { id: user_id },
              data: { email: email,password: crypt_password},
            });
            await prisma.agentLanguages.deleteMany({
              where: { user_id: user_id },
            });
          for (var i = 0; i < language.length; i++) {
            await prisma.agentLanguages.create({
              data: {
                user_id: user_id,
                language: language[i],
              },
            });
          }
          return res.json({status:"success", message:"Agent Updated"})
      }
      else{
          return res.json({status:"failed", message:"Email has already registered"})
      }    
  }
  else{
    if (req.file) {
      const file = req.file;
      const blob = await put(file.originalname, file.buffer, { access: 'public',token:process.env.BLOB_READ_WRITE_TOKEN });
      const profile_picture = blob.url
      
      await prisma.agent.updateMany({
        where: { user_id: user_id },
        data: { name: name,phone: phone, profile_picture : profile_picture},
      });
    }
    else{
      await prisma.agent.updateMany({
        where: { user_id: user_id },
        data: { name: name,phone: phone},
      });
    }
    await prisma.user.updateMany({
      where: { id: user_id },
      data: { email: email,password: crypt_password},
    });
    await prisma.agentLanguages.deleteMany({
      where: { user_id: user_id },
    });
      for (var i = 0; i < language.length; i++) {
        await prisma.agentLanguages.create({
          data: {
            user_id: user_id,
            language: language[i],
          },
        });
      }
      return res.json({status:"success", message:"Agent Updated"})
  }
  } catch (error) {
    return res.json({status:"failed", message:`${error}`})
  }
};
function put(originalname: string, buffer: Buffer, arg2: { access: string; token: string | undefined; }) {
  throw new Error('Function not implemented.');
}

