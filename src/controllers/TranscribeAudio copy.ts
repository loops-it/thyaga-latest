import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";
import { Request as ExpressRequest, Response } from "express";
import File from "../../models/File";
import BotChats from "../../models/BotChats";
import { Translate } from "@google-cloud/translate/build/src/v2";
const speech = require("@google-cloud/speech");
import multer from "multer";


const upload = multer();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (
  !process.env.PINECONE_API_KEY ||
  typeof process.env.PINECONE_API_KEY !== "string"
) {
  throw new Error("Pinecone API key is not defined or is not a string.");
}
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

interface RequestWithChatId extends ExpressRequest {
  userChatId?: string;
}
interface ChatEntry {
  role: string;
  content: string;
}


const serviceAccountKey = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : "",
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
};

// console.log("serviceAccountKey: ", serviceAccountKey);

const clientGoogle = new speech.SpeechClient({
  credentials: serviceAccountKey,
});

const translate = new Translate({
  credentials: serviceAccountKey,
});

export const chatTranscribeAudio = async (
  req: RequestWithChatId,
  res: Response
) => {

  // variables
  const index = pc.index("botdb");
  const namespace = index.namespace("thyaga-data");
  let userChatId = req.body.voiceID ?? null;

  // console.log("Request body:", req.body);
  // console.log("userChatId value:", userChatId);

  // if (userChatId === null) {
  //   console.log("id is null");
  // } else if (userChatId === "") {
  //   console.log("id is an empty string");
  // } else {
  //   console.log("id is not null and not an empty string");
  // }

  let language = req.body.language;
  let transcribedText: any;
  let chatHistory = req.body.messages || [];

  console.log("req messages: ", chatHistory);
  let kValue = 2;

  let context: any;


  // =======================================================
  // Prompts
  // =======================================================

  
  const systemPrompt = `You are a helpful assistant and you are friendly. If the user greets you, respond warmly. Your name is Thyaga GPT. Answer user questions only based on the given context: ${context}. Your answer must be less than 180 tokens. If the user asks for information like your email or address, provide the Thyaga email and address. If your answer has a list, format it as a numbered list.

For specific questions about available categories (e.g., "What are the choices available in Thyaga?"), provide the relevant categories as listed in the context. If the user asks about Supermarkets using the Thyaga voucher, respond with the information you have available, but clarify if specific details aren't listed.

If the user asks for merchants generically, list the merchant types and ask to specify a category.

For any questions not relevant to the context, provide the best available information based on what you have.

If the user question is not relevant to the context, just say "Sorry, I couldn't find any information. Would you like to chat with a live agent?".

Do NOT make up any answers or provide information not relevant to the context using public information.
`;


  // add system prompt to chatHistory
  if (!chatHistory || chatHistory.length === 0) {
    chatHistory = [{ role: "system", content: systemPrompt }];
  }
  

  function generateChatId() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = ("0" + (currentDate.getMonth() + 1)).slice(-2);
    const day = ("0" + currentDate.getDate()).slice(-2);
    const hours = ("0" + currentDate.getHours()).slice(-2);
    const minutes = ("0" + currentDate.getMinutes()).slice(-2);
    const seconds = ("0" + currentDate.getSeconds()).slice(-2);
  
    const prefix = "chat";
    return `${prefix}_${year}${month}${day}_${hours}${minutes}${seconds}`;
  }



  // check user id - if null create one
  if (userChatId === null || userChatId.trim() === "") {
    userChatId = generateChatId();
    console.log("Generated chat id:", userChatId);
  } else {
    console.log("Existing chat id:", userChatId);
  }




  // ===========================================================
  // Audio transcribe
  //============================================================
  let languageCode = "en-US";
  if (language === "Sinhala") {
    languageCode = "si-LK";
  } else if (language === "Tamil") {
    languageCode = "ta-IN";
  }

  if (!req.file) {
    return res.status(400).send("No audio file uploaded.");
  }

  const audioBuffer = req.file.buffer;

  console.log("audioBuffer : ", audioBuffer);

  const request = {
    audio: {
      content: audioBuffer.toString("base64"),
    },
    config: {
      encoding: "MP3",
      sampleRateHertz: 16000,
      languageCode: languageCode,
    },
  };

  try {
    const [response] = await clientGoogle.recognize(request);
    const transcription = response.results
      .map(
        (result: { alternatives: { transcript: any }[] }) =>
          result.alternatives[0].transcript
      )
      .join("\n");
    transcribedText = transcription;
    console.log(`chatID: ${userChatId} \n Language: ${language} \n Transcription (Google Cloud): ${transcribedText}`);
    // console.log(chatHistory)
    console.log(userChatId)

    // ===========================================================
  // translate to english
  //============================================================
  let translatedQuestion = "";
  if (language == "Sinhala") {
    translatedQuestion = await translateToEnglish(transcribedText);
  } else if (language === "Tamil") {
    translatedQuestion = await translateToEnglish(transcribedText);
  } else {
    translatedQuestion = transcribedText;
  }
  async function translateToEnglish(transcribedText: string) {
    const [translationsToEng] = await translate.translate(transcribedText, "en");
    const finalQuestion = Array.isArray(translationsToEng)
      ? translationsToEng.join(", ")
      : translationsToEng;
    return finalQuestion;
  }
  chatHistory.push({ role: "user", content: transcribedText });
  const chatHistoryString = JSON.stringify(chatHistory);

  const last15Messages = chatHistory.slice(-15);

      const combinedMessages = [...chatHistory, ...last15Messages];

      const uniqueCombinedMessages = Array.from(
        new Map(
          combinedMessages.map((item) => [JSON.stringify(item), item])
        ).values()
      );

      console.log("unique Combined Messages : ", uniqueCombinedMessages);

      const questionRephrasePrompt = `As a customer service assistant, kindly assess whether the FOLLOWUP QUESTION related to the CHAT HISTORY or if it introduces a new question. If the FOLLOWUP QUESTION is unrelated, refrain from rephrasing it. However, if it is related, please rephrase it as an independent query utilizing relevent keywords from the CHAT HISTORY.
----------
CHAT HISTORY: {${chatHistoryString}}
----------
FOLLOWUP QUESTION: {${translatedQuestion}}
----------
Standalone question:`;

      const completionQuestion = await openai.completions.create({
        model: "gpt-3.5-turbo-instruct",
        prompt: questionRephrasePrompt,
        max_tokens: 50,
        temperature: 0,
      });

      console.log("Standalone Question :", completionQuestion.choices[0].text);

      const categoryList = ["merchants", "about"];


      const categorySelectionPrompt = `
Given a question and a list of categories, identify the appropriate category. Use the following guidelines:
1. If the question asks for types or a list of categories of merchants, categorize it as "merchants".
2. If the question asks for merchants of any specific category (e.g., "hotel merchants"), categorize it as "merchants".
3. If the question asks for merchants in a specific location (e.g., "merchants in Thyaga"), categorize it as "merchants".
4. If the question asks for Thyaga merchants, who are the merchants, or any similar variations, categorize it as "merchants".
5. For all other questions, provide only the exact matching category name from the list.
6. If the question asks for information about Thyaga, categorize it as "about".
7. If there is no match, state "Unavailable".

Do not add any additional text or punctuation.
----------
QUESTION: {${completionQuestion.choices[0].text}}
----------
CATEGORY LIST: {${categoryList}}
----------
Answer:
`;

      const categorySelection = await openai.completions.create({
        model: "gpt-3.5-turbo-instruct",
        prompt: categorySelectionPrompt,
        max_tokens: 50,
        temperature: 0,
      });

      console.log("Category :", categorySelection.choices[0].text.trim());


      // =============================================================================
      // create embeddings
      const embedding = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: completionQuestion.choices[0].text,
      });
      // console.log(embedding.data[0].embedding);

      let queryResponse;

      if (categorySelection.choices[0].text.trim() === "Unavailable") {
        queryResponse = await namespace.query({
          vector: embedding.data[0].embedding,
          topK: kValue,
          includeMetadata: true,
        });
      } else {
        queryResponse = await namespace.query({
          vector: embedding.data[0].embedding,
          topK: kValue,
          filter: {
            Category: { $eq: categorySelection.choices[0].text.trim() },
          },
          includeMetadata: true,
        });
      }



      // get vector documents into one string
      const results: string[] = [];
      // console.log("CONTEXT : ", queryResponse.matches[0].metadata);
      queryResponse.matches.forEach((match) => {
        if (match.metadata && typeof match.metadata.Title === "string") {
          const result = `Title: ${match.metadata.Title}, \n Category: ${match.metadata.Category} \n Content: ${match.metadata.Text} \n \n `;
          results.push(result);
        }
      });
      let context = results.join("\n");
      console.log("CONTEXT : ", context);
  
// GPT response ===========================
const completion = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: chatHistory,
  max_tokens: 200,
  temperature: 0,
});

let botResponse: string | null = completion.choices[0].message.content;
let selectedLanguage = "en";
let translatedResponse = "";
// console.log("userQuestion : ", userQuestion)
if (language == "Sinhala") {
  selectedLanguage = "si";
  if (botResponse !== null) {
    translatedResponse = await translateToLanguage(botResponse);
  }
} else if (language === "Tamil") {
  selectedLanguage = "ta";
  if (botResponse !== null) {
    translatedResponse = await translateToLanguage(botResponse);
  }
} else {
  selectedLanguage = "en";
  if (botResponse !== null) {
    translatedResponse = botResponse;
  }
}

async function translateToLanguage(botResponse: string) {
  const [translationsToLanguage] = await translate.translate(
    botResponse,
    selectedLanguage
  );
  const finalAnswer = Array.isArray(translationsToLanguage)
    ? translationsToLanguage.join(", ")
    : translationsToLanguage;
  return finalAnswer;
}


// add assistant to array
chatHistory.push({ role: "assistant", content: botResponse });

console.log("GPT : ", chatHistory);



  res.json({
    userText: transcribedText,
    answer: botResponse,
    chatHistory: chatHistory,
    chatId: userChatId,
  });
    // res.json({ text: transcription });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).send("Error during transcription");
  }
};
