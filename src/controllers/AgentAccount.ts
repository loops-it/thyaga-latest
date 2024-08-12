import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../../models/User';
import Agent from '../../models/Agent';
import AgentLanguages from '../../models/AgentLanguages';

export const agentCreateAccount = async (req: Request, res: Response) => {
    const {name, phone, email, password, language} = req.body;
    console.log(req.body);
    try {
        const email_exist = await prisma.user.findFirst({
          where: {
          email : email,
          },
        });
      if(email_exist[0]){

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
            for (var i = 0; i < language.length; i++) {
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
  const {agent_name, phone, email, user_id,language} = req.body

  try {
    const email_exist = await prisma.user.findFirst({
      where: {
      email : email,
      },
    });
  if(email_exist[0]){
      if(email_exist[0].id == user_id){
          await prisma.agent.updateMany({
            where: { user_id: user_id },
            data: { name: agent_name, phone: phone },
          });
            
          await prisma.user.updateMany({
            where: { id: user_id },
            data: { email: email },
          });
          await prisma.agentLanguages.deleteMany({
              where: { user_id: user_id },
            });  
          for (var i = 0; i < language.length; i++) {
              await prisma.agentLanguages.create({
                data: {
                  user_id: user_id,
                  language: lang,
                },
              });
            }
          });
          return res.json({status:"success", message:"Agent Updated"})
      }
      else{
          return res.json({status:"failed", message:"Email has already registered"})
      }    
  }
  else{
      await prisma.agent.updateMany({
        where: { user_id: user_id },
        data: { name: agent_name, phone: phone },
      });
      await prisma.user.updateMany({
        where: { id: user_id },
        data: { email: email },
      });

      await prisma.agentLanguages.deleteMany({
        where: { user_id: user_id },
      });
      for (var i = 0; i < language.length; i++) {
          await prisma.AgentLanguages.create({
            data: {
              user_id: user_id,
              language: lang,
            },
          });
        }
      });
      return res.json({status:"success", message:"Agent Updated"})
  }
  } catch (error) {
    return res.json({status:"failed", message:`${error}`})
  }
};

export const agentUpdateWithPassword = async (req: Request, res: Response, next: Function) => {
  const {agent_name, phone, email, user_id, password,language} = req.body
  const crypt_password = await (bcrypt.hash(password, 10));
  try {
    const email_exist = prisma.user.findFirst({
      where: {
      email : email,
      },
    });
  if(email_exist[0]){
      if(email_exist[0].id == user_id){
        await prisma.agent.updateMany({
          where: { user_id: user_id },
          data: { name: agent_name, phone: phone },
        });
          await prisma.user.updateMany({
            where: { id: user_id },
            data: { email: email, password: crypt_password },
          });
            await prisma.agentLanguages.deleteMany({
              where: { user_id: user_id },
            });
          for (var i = 0; i < language.length; i++) {
              await prisma.agentLanguages.create({
                data: {
                  user_id: user_id,
                  language: lang,
                },
              });
            }
          });
          return res.json({status:"success", message:"Agent Updated"})
      }
      else{
          return res.json({status:"failed", message:"Email has already registered"})
      }    
  }
  else{
    await prisma.agent.updateMany({
      where: { user_id: user_id },
      data: { name: agent_name, phone: phone },
    });
      await prisma.user.updateMany({
        where: { id: user_id },
        data: { email: email, password: crypt_password },
      });
        await prisma.agentLanguages.deleteMany({
          where: { user_id: user_id },
        });  
      for (var i = 0; i < language.length; i++) {
          await prisma.agentLanguages.create({
            data: {
              user_id: user_id,
              language: lang,
            },
          });
        }
      return res.json({status:"success", message:"Agent Updated"})
  }
  } catch (error) {
    return res.json({status:"failed", message:`${error}`})
  }
};