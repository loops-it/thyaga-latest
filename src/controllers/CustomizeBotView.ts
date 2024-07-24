import { Request, Response } from 'express';
const bodyParser = require('body-parser');
const pdfParse = require('pdf-parse');
import "dotenv/config";


// Define the uploadDocuments middleware
export const CustomizeBotView = async (req: Request, res: Response, next: Function) => {
    //console.log(req.session.user.id)
    try {

        res.render('customization');

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
};  