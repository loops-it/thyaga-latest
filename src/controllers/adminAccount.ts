import { Request, Response } from 'express';
import bodyParser from 'body-parser';
import pdfParse from 'pdf-parse';
import multer from 'multer';
import OpenAI from "openai";
import { Pinecone } from '@pinecone-database/pinecone';
import "dotenv/config";
import User from '../../models/User';
import Admin from '../../models/Admin';
import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface UserDecodedToken extends JwtPayload {
  id: string;
}

export const adminAccountCreate = async (req: Request, res: Response, next: Function) => {
    let { name, phone, email, password, user_role } = req.body;

    try {
        const email_exist = await prisma.user.findFirst({
            where: { email: email },
        });

        if (email_exist) {
            return res.json({ status: "failed", message: "Email has already registered" });
        } else {
            const crypt_password = await bcrypt.hash(password, 10);
            let user = await prisma.user.create({
                data: {
                    email: email,
                    password: crypt_password,
                    user_role: user_role,
                    status: "active",
                },
            });
            await prisma.admin.create({
                data: {
                    user_id: user.id,
                    name: name,
                    phone: phone,
                    status: "active",
                },
            });
            return res.json({ status: "success", message: "Admin Added" });
        }
    } catch (error) {
        return res.json({ status: "failed", message: `${error}` });
    }
};

export const adminUpdate = async (req: Request, res: Response, next: Function) => {
    const { admin_name, phone, email, user_id } = req.body;

    try {
        const email_exist = await prisma.user.findFirst({
            where: { email: email },
        });

        if (email_exist && email_exist.id !== user_id) {
            return res.json({ status: "failed", message: "Email has already registered" });
        } else {
            await prisma.admin.updateMany({
                where: { user_id: user_id },
                data: { name: admin_name, phone: phone },
            });
            await prisma.user.updateMany({
                where: { id: user_id },
                data: { email: email },
            });
            return res.json({ status: "success", message: "Admin Updated" });
        }
    } catch (error) {
        return res.json({ status: "failed", message: `${error}` });
    }
};

export const matchPassword = async (req: Request, res: Response, next: Function) => {
    const { current_password, user_id } = req.body;

    try {
        const user = await prisma.user.findFirst({
            where: { id: user_id },
        });

        if (!user || !await bcrypt.compare(current_password, user.password)) {
            return res.json({ status: "failed", message: "Current password is incorrect" });
        } else {
            return res.json({ status: "success" });
        }
    } catch (error) {
        return res.json({ status: "failed", message: `${error}` });
    }
};

export const adminUpdateWithPassword = async (req: Request, res: Response, next: Function) => {
    const { admin_name, phone, email, user_id, password } = req.body;
    const crypt_password = await bcrypt.hash(password, 10);

    try {
        const email_exist = await prisma.user.findFirst({
            where: { email: email },
        });

        if (email_exist && email_exist.id !== user_id) {
            return res.json({ status: "failed", message: "Email has already registered" });
        } else {
            await prisma.admin.updateMany({
                where: { user_id: user_id },
                data: { name: admin_name, phone: phone },
            });
            await prisma.user.updateMany({
                where: { id: user_id },
                data: { email: email, password: crypt_password },
            });
            return res.json({ status: "success", message: "Admin Updated" });
        }
    } catch (error) {
        return res.json({ status: "failed", message: `${error}` });
    }
};
