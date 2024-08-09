import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";
import { Request as ExpressRequest, Response } from "express";
import File from "../../models/File";
import BotChats from "../../models/BotChats";
import { Translate } from "@google-cloud/translate/build/src/v2";

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
const translate = new Translate({
  key: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export const chatResponse = async (req: RequestWithChatId, res: Response) => {
  // console.log("req : ", req.body.chatId)
  const index = pc.index("botdb");
  const namespace = index.namespace("thyaga-data");
  //thyaga-data

  let userChatId = req.body.chatId || "";
  let language = req.body.language;

  console.log(req.body.language);

  try {
    // chat id
    if (!userChatId) {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = ("0" + (currentDate.getMonth() + 1)).slice(-2);
      const day = ("0" + currentDate.getDate()).slice(-2);
      const hours = ("0" + currentDate.getHours()).slice(-2);
      const minutes = ("0" + currentDate.getMinutes()).slice(-2);
      const seconds = ("0" + currentDate.getSeconds()).slice(-2);

      const prefix = "chat";
      userChatId = `${prefix}_${year}${month}${day}_${hours}${minutes}${seconds}`;

      // console.log("Generated chat id : ", userChatId);
    } else {
      // console.log("Existing chat id : ", userChatId);
    }

    //============= get question ======================
    // get user message with history
    let chatHistory = req.body.messages || [];

    // Get the user question from the chat history
    let userQuestion = "";
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      if (chatHistory[i].role === "user") {
        userQuestion = chatHistory[i].content;
        break;
      }
    }

    let translatedQuestion = "";
    // console.log("userQuestion : ", userQuestion)
    if (language == "Sinhala") {
      translatedQuestion = await translateToEnglish(userQuestion);
    } else if (language === "Tamil") {
      translatedQuestion = await translateToEnglish(userQuestion);
    } else {
      translatedQuestion = userQuestion;
    }

    // console.log("userQuestion",userQuestion);
    console.log("translatedQuestion", translatedQuestion);
    async function translateToEnglish(userQuestion: string) {
      const [translationsToEng] = await translate.translate(userQuestion, "en");
      const finalQuestion = Array.isArray(translationsToEng)
        ? translationsToEng.join(", ")
        : translationsToEng;
      return finalQuestion;
    }
    const lastUserIndex = chatHistory
      .map((entry: ChatEntry) => entry.role)
      .lastIndexOf("user");
    if (lastUserIndex !== -1) {
      chatHistory[lastUserIndex].content = translatedQuestion;
      // console.log(chatHistory);
    }
    // await BotChats.create({
    //   message_id: userChatId,
    //   language: language,
    //   message: userQuestion,
    //   message_sent_by: "customer",
    //   viewed_by_admin: "no",
    // });

    await prisma.botChats.create({
      data: {
          message_id: userChatId,
          language: language,
          message: userQuestion,
          message_sent_by: "customer",
          viewed_by_admin: "no",
      },
    });

    let kValue = 2;

    //============= change context ======================
    async function handleSearchRequest(
      translatedQuestion: string,
      kValue: number
    ) {
      // ================================================================
      // STANDALONE QUESTION GENERATE
      // ================================================================
      const filteredChatHistory = chatHistory.filter(
        (item: { role: string }) => item.role !== "system"
      );

      const chatHistoryString = JSON.stringify(filteredChatHistory);

      const systemMessages = chatHistory.filter(
        (item: { role: string }) => item.role === "system"
      );

      const last15Messages = chatHistory.slice(-15);

      const combinedMessages = [...systemMessages, ...last15Messages];

      const uniqueCombinedMessages = Array.from(
        new Map(
          combinedMessages.map((item) => [JSON.stringify(item), item])
        ).values()
      );

      console.log("uniqueCombinedMessages : ", uniqueCombinedMessages);

      console.log("chatHistoryString chat : ", chatHistoryString);

      // const questionRephrasePrompt = `As a senior banking assistant, kindly assess whether the FOLLOWUP QUESTION related to the CHAT HISTORY or if it introduces a new question. If the FOLLOWUP QUESTION is unrelated, refrain from rephrasing it. However, if it is related, please rephrase it as an independent query utilizing relevent keywords from the CHAT HISTORY, even if it is a question related to the calculation. If the user asks for information like email or address, provide Thyaga email and address.
      // ----------
      // CHAT HISTORY: {${chatHistoryString}}
      // ----------
      // FOLLOWUP QUESTION: {${translatedQuestion}}
      // ----------
      // Standalone question:`

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

      // console.log("chatHistory : ", chatHistory);
      // console.log("Standalone Question PROMPT :", questionRephrasePrompt)
      console.log("Standalone Question :", completionQuestion.choices[0].text);

      // const categoryList = [
      //   "personal care",
      //   "automobile",
      //   "accessories",
      //   "opticians",
      //   "hotels",
      //   "watches",
      //   "homeware",
      //   "baby",
      //   "books & stationery",
      //   "pharmacy",
      //   "games",
      //   "adventure",
      //   "fitness",
      //   "flora",
      //   "super market",
      //   "mobile & electronics",
      //   "studio",
      //   "electronics",
      //   "medical",
      //   "cafe and restaurants"
      // ];

      // const categorySelectionPrompt = `
      //   Given a question and a list of categories, identify the category that matches the question. If the question specifically asks for types of merchants, categorize it as "Merchants". For all other questions, provide only the exact matching category name from the list. If there is no match, state "Unavailable". Do not add any additional text or punctuation.
      //   ----------
      //   QUESTION: {${completionQuestion.choices[0].text}}
      //   ----------
      //   CATEGORY LIST: {${categoryList}}
      //   ----------
      //   Standalone question:
      //   `;

      // const categoryList = [
      //   "personal care",
      //   "automobile",
      //   "accessories",
      //   "opticians",
      //   "hotels",
      //   "watches",
      //   "homeware",
      //   "baby",
      //   "books & stationery",
      //   "pharmacy",
      //   "games",
      //   "adventure",
      //   "fitness",
      //   "flora",
      //   "super market",
      //   "mobile & electronics",
      //   "studio",
      //   "electronics",
      //   "medical",
      //   "cafe and restaurants",
      //   'merchants'
      // ];

      const categoryList = ["merchants", "about"];
      // const categorySelectionPrompt = `
      // Given a question and a list of categories, identify the category that matches the question. If the question specifically asks for types of merchants or for merchants list, categorize it as "merchants". For all other questions, provide only the exact matching category name from the list. If there is no match, state "Unavailable". Do not add any additional text or punctuation.
      // ----------
      // QUESTION: {${completionQuestion.choices[0].text}}
      // ----------
      // CATEGORY LIST: {${categoryList}}
      // ----------
      // Standalone question:
      // `;

      // const categorySelectionPrompt = `
      // Given a question and a list of categories, identify the appropriate category. Use the following guidelines:
      // 1. If the question asks for types or a list of categories of merchants, categorize it as "merchants".
      // 2. If the question asks for merchants of any specific category (e.g., "hotel merchants"), categorize it as "merchants".
      // 3. If the question asks for merchants in a specific location (e.g., "merchants in Thyaga"), categorize it as "merchants".
      // 5. For all other questions, provide only the exact matching category name from the list.
      // 6. If the question asks for information about thyaga categorize it as "about".
      // 6. If there is no match, state "Unavailable".

      // Do not add any additional text or punctuation.
      // ----------
      // QUESTION: {${completionQuestion.choices[0].text}}
      // ----------
      // CATEGORY LIST: {${categoryList}}
      // ----------
      // Answer:
      // `;

//       const categorySelectionPrompt = `
// Given a question and a list of categories, identify the appropriate category. Use the following guidelines:
// 1. If the question asks for types or a list of categories of merchants, categorize it as "merchants".
// 2. If the question asks for merchants of any specific category (e.g., "hotel merchants"), categorize it as "merchants".
// 3. If the question asks for merchants in a specific location (e.g., "merchants in Thyaga"), categorize it as "merchants".
// 4. If the question asks for Thyaga merchants or similar variations, categorize it as "merchants".
// 5. For all other questions, provide only the exact matching category name from the list.
// 6. If the question asks for information about Thyaga, categorize it as "about".
// 7. If there is no match, state "Unavailable".

// Do not add any additional text or punctuation.
// ----------
// QUESTION: {${completionQuestion.choices[0].text}}
// ----------
// CATEGORY LIST: {${categoryList}}
// ----------
// Answer:
// `;

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

      // =============================================================================
      // query from pinecone
      // console.log('K - ', kValue)
      // const queryResponse = await namespace.query({
      //   vector: embedding.data[0].embedding,
      //   topK: kValue,
      //   includeMetadata: true,
      // });
      // console.log("VECTOR RESPONSE : ",queryResponse.matches)

      // =============================================================================
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

      // set system prompt
      // =============================================================================


      // const sysPrompt = `You are a helpful assistant and you are friendly. If the user greets you, respond warmly. Your name is Thyaga GPT. Answer user questions only based on the given context: ${context}. Your answer must be less than 180 tokens. If the user asks for information like your email or address, provide the Thyaga email and address. If your answer has a list, format it as a numbered list.

      // For specific questions about available categories (e.g., "What are the choices available in Thyaga?"), provide the relevant categories as listed in the context. If the user asks about Supermarkets using the Thyaga voucher, respond with the information you have available, but clarify if specific details aren't listed.

      // For any questions not relevant to the context, provide the best available information based on what you have.

      // If user question is not relevent to the Context just say "Sorry, I couldn't find any information. Would you like to chat with a live agent?".
      // Do NOT make up any answers or provide information not relevant to the context using public information.
      // `;


      const sysPrompt = `You are a helpful assistant and you are friendly. If the user greets you, respond warmly. Your name is Thyaga GPT. Answer user questions only based on the given context: ${context}. Your answer must be less than 180 tokens. If the user asks for information like your email or address, provide the Thyaga email and address. If your answer has a list, format it as a numbered list.

For specific questions about available categories (e.g., "What are the choices available in Thyaga?"), provide the relevant categories as listed in the context. If the user asks about Supermarkets using the Thyaga voucher, respond with the information you have available, but clarify if specific details aren't listed.

If the user asks for merchants generically, list the merchant types and ask to specify a category.

For any questions not relevant to the context, provide the best available information based on what you have.

If the user question is not relevant to the context, just say "Sorry, I couldn't find any information. Would you like to chat with a live agent?".

Do NOT make up any answers or provide information not relevant to the context using public information.
`;


      // const sysPrompt = `You are a helpful assistant and you are friendly. if user greet you you will give proper greeting in friendly manner. Your name is Thyaga GPT. Answer user question Only based on given Context: ${context}, your answer must be less than 150 words. If the user asks for information like your email or address, you'll provide Thyaga email and address. If answer has list give it as numberd list. If it has math question relevent to given Context give calculated answer, If user question is not relevent to the Context just say "Sorry, I couldn't find any information on that. Would you like to chat with a live agent?". Do NOT make up any answers and questions not relevant to the context using public information.`;

      if (chatHistory.length === 0 || chatHistory[0].role !== "system") {
        chatHistory.unshift({ role: "system", content: "" });
      }
      chatHistory[0].content = `${sysPrompt}`;
    }

    // async function processRequest(translatedQuestion: string, userChatId: string) {
    await handleSearchRequest(translatedQuestion, kValue);

    // console.log("chatHistory",chatHistory);
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
    // console.log("GPT : ", translatedResponse);

    // add assistant to array
    chatHistory.push({ role: "assistant", content: botResponse });

    // console.log(" send chat id : ", userChatId)
    // }
    // await processRequest(translatedQuestion, userChatId);

    // await BotChats.create({
    //   message_id: userChatId,
    //   language: language,
    //   message: translatedResponse,
    //   message_sent_by: "bot",
    //   viewed_by_admin: "no",
    // });

    await prisma.botChats.create({
      data: {
          message_id: userChatId,
          language: language,
          message: translatedResponse,
          message_sent_by: "bot",
          viewed_by_admin: "no",
      },
    });

    // console.log("botResponse",botResponse);
    // console.log("translatedResponse",translatedResponse);
    res.json({
      answer: translatedResponse,
      chatHistory: chatHistory,
      chatId: userChatId,
    });
    // }
  } catch (error) {
    console.error("Error processing question:", error);
    res.status(500).json({ error: "An error occurred." });
  }
};

// const questionRephrasePrompt = `Follow these steps to answer the user queries.

// Step 1: First find out followup question is referring to based on what conversation topic.

// step 2: rephrase the follow up question to be a standalone question with the conversation topic.

// ----------
// CHAT HISTORY: {${chatHistoryString}}
// ----------
// FOLLOWUP QUESTION: {${translatedQuestion}}
// ----------
// Standalone question:`

// const fileIds  = await File.findAll({
//     attributes: ['file_id']
//   });

//   const ids = fileIds.map(file => file.file_id);
// const fetchResult = await index.namespace('thyaga-data').fetch(ids);
// const documents = Object.values(fetchResult.records).map(record => {
//     if (record.metadata) {
//         return record.metadata.Title;
//     }
//     return null;
// }).filter(title => title !== null);

// console.log(documents);

// =======================================================================
//             const questionRephrasePrompt = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.
// ----------
// CHAT HISTORY: {${chatHistoryString}}
// ----------
// FOLLOWUP QUESTION: {${translatedQuestion}}
// ----------
// Standalone question:`
// =======================================================================

// const questionRephrasePrompt = `Given the following conversation and a follow up question, rephrase the follow up question with a insight regarding the topic discussed to be a standalone question.
// ----------
// CHAT HISTORY: {${chatHistoryString}}
// ----------
// FOLLOWUP QUESTION: {${translatedQuestion}}
// ----------
// Standalone question:`

// Give insight regarding the topic discussed.
// const questionRephrasePrompt = `Given the following conversation and a follow up question, Give insight regarding the topic discussed.
// ----------
// CHAT HISTORY: {${chatHistoryString}}
// ----------
// FOLLOWUP QUESTION: {${translatedQuestion}}
// ----------
// TOPIC:`

// get streaming data into a variable
// let contentArray = [];
// for await (const chunk of completion) {
//   contentArray.push(chunk.choices[0].delta.content);
// }
// const chatTextHistory = contentArray.join('');

// const randomString = Math.random().toString(36).substring(2, 15);
// const prefix = 'chat';
// userChatId = `${prefix}_${randomString}`;
// console.log("Generated chat id : ", userChatId);
