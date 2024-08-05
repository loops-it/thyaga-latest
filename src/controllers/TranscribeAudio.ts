// ============= imports =============================
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";
import { Request as ExpressRequest, RequestHandler, Response } from "express";
import File from "../../models/File";
import BotChats from "../../models/BotChats";
import { Translate } from "@google-cloud/translate/build/src/v2";
const speech = require("@google-cloud/speech");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");
import multer from "multer";
import { OperationUsage } from "@pinecone-database/pinecone/dist/data/types";
// import { AudioContext } from 'node-web-audio-api';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';





const upload = multer();

// ============= api keys import ====================
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

// open ai auth
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//pinecone auth
if (
  !process.env.PINECONE_API_KEY ||
  typeof process.env.PINECONE_API_KEY !== "string"
) {
  throw new Error("Pinecone API key is not defined or is not a string.");
}
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// translate client
const translate = new Translate({
  credentials: serviceAccountKey,
});

// speech to text client
const clientGoogle = new speech.SpeechClient({
  credentials: serviceAccountKey,
});
const textToSpeachClient = new TextToSpeechClient({
  credentials: serviceAccountKey,
});

// ==============  interfaces ======================
interface RequestWithChatId extends ExpressRequest {
  userChatId?: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}

// - for memory store
interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatHistory {
  [chatId: string]: Message[];
}

interface SystemMessages {
  [chatId: string]: Message;
}

interface ChatCompletionMessageParam {
  role: "system" | "user" | "assistant";
  content: string;
}

interface RecordMetadata {
  Title?: string;
  Category?: string;
  Text?: string;
}

interface ScoredPineconeRecord<T> {
  score: number;
  id: string;
  values: number[];
  metadata?: T;
}

// Define an interface for the expected request body structure
interface RequestBody {
  voiceID?: string;
  language?: string;
  chatStatus?: string;
}

// Initialize the in-memory stores
const chatHistoryMemory: ChatHistory = {};
const systemMessages: SystemMessages = {};

// Save message to the in-memory store
const saveMessage = (
  chatId: string,
  role: "system" | "user" | "assistant",
  content: string
): void => {
  const timestamp = new Date();
  if (role === "system") {
    systemMessages[chatId] = { role, content, timestamp };
  } else {
    if (!chatHistoryMemory[chatId]) {
      chatHistoryMemory[chatId] = [];
    }
    chatHistoryMemory[chatId].push({ role, content, timestamp });
  }
};

// Retrieve chat history from the in-memory store
const getChatHistory = (chatId: string): ChatCompletionMessageParam[] => {
  const history = chatHistoryMemory[chatId] || [];
  const systemMessage = systemMessages[chatId];
  if (systemMessage) {
    return [systemMessage, ...history];
  }
  return history;
};

// Clear chat history and system messages from the in-memory store
const clearChatMemory = (chatId: string): void => {
  delete chatHistoryMemory[chatId];
  delete systemMessages[chatId];
  console.log(`Memory cleared for chatId ${chatId}`);
};

// Generate unique chat ID
const generateChatId = (): string => {
  const currentDate = new Date();
  const prefix = "chat";
  const formattedDate = currentDate.toISOString().replace(/[-:.]/g, "");
  return `${prefix}_${formattedDate}`;
};

// Translate text to English
const translateToEnglish = async (text: string): Promise<string> => {
  const [translationsToEng] = await translate.translate(text, "en");
  return Array.isArray(translationsToEng)
    ? translationsToEng.join(", ")
    : translationsToEng;
};

// Get completion from OpenAI
const getCompletion = async (chatId: string) => {
  const history = getChatHistory(chatId);
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: history,
    max_tokens: 200,
    temperature: 0,
  });
  return completion.choices[0].message.content;
};

// Transcribe audio using Google Cloud
const transcribeAudio = async (
  audioBuffer: Buffer,
  languageCode: string
): Promise<string> => {
  const request = {
    audio: { content: audioBuffer.toString("base64") },
    config: {
      encoding: "MP3",
      sampleRateHertz: 16000,
      languageCode: languageCode,
    },
  };
  const [response] = await clientGoogle.recognize(request);
  return response.results
    .map(
      (result: { alternatives: { transcript: any }[] }) =>
        result.alternatives[0].transcript
    )
    .join("\n");
};

// Translate response to target language
const translateToLanguage = async (
  text: string,
  targetLanguage: string
): Promise<string> => {
  const [translationsToLanguage] = await translate.translate(
    text,
    targetLanguage
  );
  return Array.isArray(translationsToLanguage)
    ? translationsToLanguage.join(", ")
    : translationsToLanguage;
};

// Generate context for system prompt
const generateContext = async (
  completionQuestion: string,
  category: string,
  kValue: number
): Promise<string> => {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: completionQuestion,
  });

  const index = pc.index("botdb");
  const namespace = index.namespace("thyaga-data");

  const queryResponse = await namespace.query({
    vector: embedding.data[0].embedding,
    topK: kValue,
    filter:
      category === "Unavailable" ? undefined : { Category: { $eq: category } },
    includeMetadata: true,
  });

  return queryResponse.matches
    .map((match) => {
      const metadata = match.metadata as RecordMetadata;
      return `Title: ${metadata.Title ?? "N/A"}, \n Category: ${
        metadata.Category ?? "N/A"
      } \n Content: ${metadata.Text ?? "N/A"} \n \n`;
    })
    .join("\n");
};

// Determine category of the question
const determineCategory = async (question: string): Promise<string> => {
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
    QUESTION: {${question}}
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
  return categorySelection.choices[0].text.trim();
};



const mp3FilePath = path.join(__dirname, '../public/melodyloops-bright-shiny-morning.mp3');
console.log("file path mp3 : ", mp3FilePath)

// const audioContext = new AudioContext();
// let source: AudioBufferSourceNode | null = null;
// let isPlaying = false;

// play the MP3 file
// const playAudio = () => {
//   if (isPlaying) {
//       console.log('Audio is already playing.');
//       return;
//   }

//   // Create a readable stream from the file
//   const fileStream = fs.createReadStream(mp3FilePath);

//   // Read MP3 file into buffer
//   const mp3Buffer: Buffer[] = [];
//   fileStream.on('data', (chunk: Buffer) => mp3Buffer.push(chunk));
//   fileStream.on('end', () => {
//       const buffer = Buffer.concat(mp3Buffer);

//       // Convert Buffer to ArrayBuffer
//       const arrayBuffer = Uint8Array.from(buffer).buffer;

//       audioContext.decodeAudioData(arrayBuffer)
//           .then((audioBuffer: AudioBuffer) => {
//               // Stop and disconnect previous source if it exists
//               if (source) {
//                   source.stop();
//                   source.disconnect();
//               }

//               source = audioContext.createBufferSource();
//               source.buffer = audioBuffer;
//               source.connect(audioContext.destination);
//               source.start(0);
//               isPlaying = true;
//               console.log('Playback started.');
//           })
//           .catch((err: Error) => {
//               console.error('Error decoding audio:', err);
//           });
//   });
// };

//stop the MP3 file
// const stopAudio = () => {
//   if (isPlaying && source) {
//       try {
//           source.stop();
//           source.disconnect();
//       } catch (err) {
//           console.error('Error stopping audio:', err);
//       } finally {
//           isPlaying = false;
//           source = null; 
//           console.log('Playback stopped.');
//       }
//   } else {
//       console.log('No audio is currently playing.');
//   }
// };

// Main handler function
export const chatTranscribeAudioIntergrated = async (
  req: RequestWithChatId,
  res: Response
) => {

  // playAudio();
  const data = req.body as RequestBody;
  console.log("DATA  :  ", data);

  if (!data) {
    return res.status(400).send("Request body is missing.");
  }

  const userChatId: string =
    data.voiceID && data.voiceID !== "null" ? data.voiceID : generateChatId();
  const language = data.language || "English";
  const languageCode =
    language === "Sinhala" ? "si-LK" : language === "Tamil" ? "ta-IN" : "en-US";
  const voiceName =
    language === "Sinhala"
      ? "si-LK-Standard-A"
      : language === "Tamil"
      ? "ta-IN-Standard-C"
      : "en-GB-Standard-A";


  // if chat closed
  if (data.chatStatus === "chatClosed") {
    console.log("userChatId : ", userChatId);
    console.log("Status:", data.chatStatus);

    const historyBefore = getChatHistory(userChatId);
    console.log("Before clearing memory, history:", historyBefore);

    // await BotChats.create({
    //   message_id: userChatId,
    //   language: language,
    //   message: transcribedText,
    //   message_sent_by: "customer",
    //   viewed_by_admin: "no",
    // });

    // await BotChats.create({
    //   message_id: userChatId,
    //   language: language,
    //   message: translatedResponse,
    //   message_sent_by: "bot",
    //   viewed_by_admin: "no",
    // });

    clearChatMemory(userChatId);

    const historyAfter = getChatHistory(userChatId);
    console.log("After clearing memory, history:", historyAfter);

    return res.status(200).send("Chat closed and memory cleared.");
  } else {
    console.log("chat ongoing : ", data.chatStatus);

    if (!req.file) {
      return res.status(400).send("No audio file uploaded.");
    }
    try {
      const audioBuffer = req.file.buffer;
      const transcribedText = await transcribeAudio(audioBuffer, languageCode);
      if (!transcribedText) {
        const errorResponse =
          "Sorry, I couldn't hear that. Could you please repeat your message?";
        saveMessage(
          userChatId,
          "system",
          "You are a helpful assistant. If the user cannot be heard, ask them to repeat their message."
        );
        saveMessage(userChatId, "assistant", errorResponse);

        const [response] = await textToSpeachClient.synthesizeSpeech({
          input: { text: errorResponse },
          voice: { languageCode: languageCode, name: voiceName },
          audioConfig: { audioEncoding: "MP3" },
        });

        // stopAudio();
        return res.status(200).json({
          userText: transcribedText,
          chatId: userChatId,
          answer: errorResponse,
          audioSrc: `data:audio/mp3;base64,${response.audioContent.toString(
            "base64"
          )}`,
        });
      }

      const translatedQuestion =
        language === "English"
          ? transcribedText
          : await translateToEnglish(transcribedText);

      const systemPrompt = `You are a helpful assistant and you are friendly. If the user greets you, respond warmly. Your name is Thyaga GPT. Answer user questions only based on the given context: {context}. Your answer must be less than 180 tokens. If the user asks for information like your email or address, provide the Thyaga email and address. If your answer has a list, format it as a numbered list. For specific questions about available categories (e.g., "What are the choices available in Thyaga?"), provide the relevant categories as listed in the context. If the user asks about Supermarkets using the Thyaga voucher, respond with the information you have available, but clarify if specific details aren't listed. If the user asks for merchants generically, list the merchant types and ask to specify a category. For any questions not relevant to the context, If the user question is not relevant to the context, just say "Sorry, I couldn't find any information. Would you like to chat with a live agent?". Do NOT make up any answers or provide information not relevant to the context using public information.`;

      saveMessage(userChatId, "system", systemPrompt);
      saveMessage(userChatId, "user", translatedQuestion);

      const questionRephrasePrompt = `As a customer service assistant, kindly assess whether the FOLLOWUP QUESTION related to the CHAT HISTORY or if it introduces a new question. If the FOLLOWUP QUESTION is unrelated, refrain from rephrasing it. However, if it is related, please rephrase it as an independent query utilizing relevant keywords from the CHAT HISTORY. ---------- CHAT HISTORY: {${JSON.stringify(
        chatHistoryMemory[userChatId]?.slice(-5) ?? []
      )}} ---------- FOLLOWUP QUESTION: {${translatedQuestion}} ---------- Standalone question:`;

      const completionQuestion = await openai.completions.create({
        model: "gpt-3.5-turbo-instruct",
        prompt: questionRephrasePrompt,
        max_tokens: 50,
        temperature: 0,
      });
      console.log(
        "Standalone question : ",
        completionQuestion.choices[0].text.trim()
      );

      const category = await determineCategory(
        completionQuestion.choices[0].text.trim()
      );
      console.log("category : ", category);

      const context = await generateContext(
        completionQuestion.choices[0].text.trim(),
        category,
        4
      );
      saveMessage(
        userChatId,
        "system",
        systemPrompt.replace("{context}", context)
      );

      const assistantResponse = await getCompletion(userChatId);
      console.log("Assistant response : ", assistantResponse);
      const translatedResponse =
        language === "English"
          ? assistantResponse
          : await translateToLanguage(assistantResponse || "", language);
      saveMessage(userChatId, "assistant", translatedResponse || "");

      const [response] = await textToSpeachClient.synthesizeSpeech({
        input: { text: translatedResponse },
        voice: { languageCode: languageCode, name: voiceName },
        audioConfig: { audioEncoding: "MP3" },
      });

      // stopAudio();
      res.status(200).json({
        userText: translatedQuestion,
        chatId: userChatId,
        answer: translatedResponse,
        audioSrc: `data:audio/mp3;base64,${response.audioContent.toString(
          "base64"
        )}`,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

//provide the best available information based on what you have.
