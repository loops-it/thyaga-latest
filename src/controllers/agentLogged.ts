import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import User from '../../models/User';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface UserDecodedToken extends JwtPayload {
  id: string;
  
}

export const agentLogged = async (req: Request, res: Response, next: NextFunction) => {


    if(!req.cookies.agentLoggedIn) {
        req.flash('error', 'You have to login first');
        res.redirect('/agent');
    }
    try {
        const decode = jwt.verify(req.cookies.agentLoggedIn, "lkasdh23123h2ljqwher31414l312423") as UserDecodedToken;
    
        const user = await prisma.user.findFirst({
          where: {
            id: decode.id,
          },
        });
        if (!user) {
            req.flash('error', 'You have to login first');
            return res.redirect('/agent');
          }

        res.locals.agent_login_details = user;
        
        return next();
      } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
      }
};