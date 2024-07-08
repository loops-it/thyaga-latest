import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";
import { Request as ExpressRequest, Response } from "express";
import File from "../../models/File";
import BotChats from "../../models/BotChats";
import { Translate } from "@google-cloud/translate/build/src/v2";
const speech = require("@google-cloud/speech");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");

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

const textToSpeachClient = new TextToSpeechClient({
  credentials: serviceAccountKey,
});

export const chatAudioResponse = async (
  req: RequestWithChatId,
  res: Response
) => {
  // console.log("req : ", req.body.chatId)
  const index = pc.index("botdb");
  const namespace = index.namespace("thyaga-data");
  //thyaga-data

  let userChatId = req.body.chatId || "";
  let language = req.body.language;
  let transcriptQuestion = req.body.transcript;
  let messages = req.body.chatHistory;

  console.log("Original Chat History:", messages);


  // console.log(req.body.language)

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
    // for (let i = chatHistory.length - 1; i >= 0; i--) {
    //   if (chatHistory[i].role === "user") {
    //     userQuestion = chatHistory[i].content;
    //     break;
    //   }
    // }

    let translatedQuestion = "";
    // console.log("userQuestion : ", userQuestion)
    if (language == "Sinhala") {
      translatedQuestion = await translateToEnglish(transcriptQuestion);
    } else if (language === "Tamil") {
      translatedQuestion = await translateToEnglish(transcriptQuestion);
    } else {
      translatedQuestion = transcriptQuestion;
    }

    // console.log("userQuestion",userQuestion);
    console.log("translatedQuestion :", translatedQuestion);
    async function translateToEnglish(transcriptQuestion: string) {
      const [translationsToEng] = await clientGoogle.translate(
        transcriptQuestion,
        "en"
      );
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
    await BotChats.create({
      message_id: userChatId,
      language: language,
      message: transcriptQuestion,
      message_sent_by: "customer",
      viewed_by_admin: "no",
    });

    let kValue = 2;

    async function handleSearchRequest(
      translatedQuestion: string,
      kValue: number
    ) {
        

      const filteredChatHistory = chatHistory.filter(
        (item: { role: string }) => item.role !== "system"
      );
      console.log("Filtered Chat History:", filteredChatHistory);

      const chatHistoryString = JSON.stringify(filteredChatHistory);

      console.log("chatHistoryString : ",chatHistoryString)

    

const questionRephrasePrompt = `As a senior banking assistant, kindly assess whether the FOLLOWUP QUESTION related to the CHAT HISTORY or if it introduces a new question. If the FOLLOWUP QUESTION is unrelated, refrain from rephrasing it. However, if it is related, please rephrase it as an independent query utilizing relevent keywords from the CHAT HISTORY, even if it is a question related to the calculation. If the user asks for information like email or address, provide Thyaga email and address.
      ----------
      CHAT HISTORY: {${chatHistoryString}}
      ----------
      FOLLOWUP QUESTION: {${translatedQuestion}}
      ----------
      Standalone question:`

      const completionQuestion = await openai.completions.create({
        model: "gpt-3.5-turbo-instruct",
        prompt: questionRephrasePrompt,
        max_tokens: 50,
        temperature: 0,
      });

      console.log("Standalone Question :", completionQuestion.choices[0].text);

      // =============================================================================
      // create embeddings
      const embedding = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: completionQuestion.choices[0].text,
      });

      const queryResponse = await namespace.query({
        vector: embedding.data[0].embedding,
        topK: kValue,
        includeMetadata: true,
      });

      const results: string[] = [];

      queryResponse.matches.forEach((match) => {
        if (match.metadata && typeof match.metadata.Title === "string") {
          const result = `Title: ${match.metadata.Title}, \n Content: ${match.metadata.Text} \n \n `;
          results.push(result);
        }
      });
      let context = results.join("\n");

      // set system prompt
      // =============================================================================
      if (chatHistory.length === 0 || chatHistory[0].role !== "system") {
        chatHistory.unshift({ role: "system", content: "" });
      }
      chatHistory[0].content = `You are a helpful assistant and you are friendly. if user greet you you will give proper greeting in friendly manner. Your name is Thyaga GPT. Answer user question Only based on given Context: ${context}, your answer must be less than 150 words. If the user asks for information like your email or address, you'll provide Thyaga email and address. If answer has list give it as numberd list. If it has math question relevent to given Context give calculated answer, If user question is not relevent to the Context just say "Sorry, I couldn't find any information on that. Would you like to chat with a live agent?". Do NOT make up any answers and questions not relevant to the context using public information.`;
    }

    await handleSearchRequest(transcriptQuestion, kValue);

    // console.log("chatHistory",chatHistory);
    // GPT response ===========================
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: chatHistory,
      max_tokens: 180,
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

    console.log("translatedResponse (SP2TXT) : ", translatedResponse);

    chatHistory.push({ role: 'assistant', content: translatedResponse });

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

    

    const [response] = await textToSpeachClient.synthesizeSpeech({
      input: { text: translatedResponse },
      voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
      audioConfig: { audioEncoding: "MP3" },
    });

    const audioContent = response.audioContent.toString("base64");
    const audioSrc = `data:audio/mp3;base64,${audioContent}`;

    await BotChats.create({
        message_id: userChatId,
        language: language,
        message: translatedResponse,
        message_sent_by: "bot",
        viewed_by_admin: "no",
      });

    // console.log("botResponse",botResponse);
    // console.log("translatedResponse",translatedResponse);
    res.json({
      answer: translatedResponse,
      chatHistory: chatHistory,
      chatId: userChatId,
      audioSrc: audioSrc,
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

















  // const questionRephrasePrompt = `As a senior banking assistant, kindly assess whether the FOLLOWUP QUESTION related to the CHAT HISTORY or if it introduces a new question. If the FOLLOWUP QUESTION is unrelated, refrain from rephrasing it. However, if it is related, please rephrase it as an independent query utilizing relevent keywords from the CHAT HISTORY, even if it is a question related to the calculation. If the user asks for information like email or address, provide Thyaga email and address.
      // ----------
      // CHAT HISTORY: {${chatHistoryString}}
      // ----------
      // FOLLOWUP QUESTION: {${translatedQuestion}}
      // ----------
      // Standalone question:`

      

//       const questionRephrasePrompt = `As a customer service assistant, kindly assess whether the FOLLOWUP QUESTION related to the CHAT HISTORY or if it introduces a new question. If the FOLLOWUP QUESTION is unrelated, refrain from rephrasing it. However, if it is related, please rephrase it as an independent query utilizing relevent keywords from the CHAT HISTORY.
// ----------
// CHAT HISTORY: {${chatHistoryString}}
// ----------
// FOLLOWUP QUESTION: {${translatedQuestion}}
// ----------
// Standalone question:`;