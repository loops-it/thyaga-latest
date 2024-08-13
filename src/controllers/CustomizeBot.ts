import { Request, Response } from 'express';
import mysql from 'mysql2';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import customize from '../../models/Customize';


import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Configure MySQL connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});



// Define the uploadDocuments middleware
export const customizeBot = async (req: Request, res: Response, next: Function) => {

    try {
        const { title, color } = req.body;
        const file = req.file;
  
        console.log('Request Body:', req.body);
        console.log(`Title: ${title}, Color: ${color}`);
  
        // if (file) {
        //   console.log(`Uploaded File: ${file.filename}`);
  
        //   // Insert data into MySQL
        //   const connection = pool.promise();
        //   await connection.query(
        //     'INSERT INTO customize (bot_Name, color, select_image) VALUES (?, ?, ?)',
        //     [title, color, file.filename]
        //   );
  
        //   res.send('Document upload and data insertion successful.');
        // } else {
        //   res.send('No file uploaded.');
        // }

        await prisma.customize.create({
          data: {
            bot_Name: title,
            color: color,
            select_image: "",  // Ensure this is an empty string or handle appropriately
          },
        });
        
      } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
      }

//   upload.single('file')(req, res, async (err: any) => {
//     if (err) {
//       console.error('Multer Error:', err);
//       return res.status(500).send('File upload failed');
//     }

   
//   });

};


