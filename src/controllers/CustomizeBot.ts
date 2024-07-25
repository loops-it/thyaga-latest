import { Request, Response } from 'express';
const bodyParser = require('body-parser');
const pdfParse = require('pdf-parse');
import "dotenv/config";



// Define the uploadDocuments middleware
export const customizeBot = async (req: Request, res: Response, next: Function) => {
    //console.log(req.session.user.id)
    try {
        const { title, color } = req.body;
        const file = req.file;

        console.log(req.body);
        console.log(`Title: ${title}, Color: ${color}`);

        if (file) {
            console.log(`Uploaded File: ${file.filename}`);
        }

        res.send('PDF upload successful.');

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
};  