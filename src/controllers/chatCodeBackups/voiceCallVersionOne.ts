// ============= imports =============================
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";
import { Request as ExpressRequest, Response } from "express";
import File from "../../../models/File";
import BotChats from "../../../models/BotChats";
import { Translate } from "@google-cloud/translate/build/src/v2";
const speech = require("@google-cloud/speech");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");
import multer from "multer";
import { OperationUsage } from "@pinecone-database/pinecone/dist/data/types";
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

// ==============  interface ======================
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

// Initialize the in-memory stores
const chatHistoryMemory: ChatHistory = {};
const systemMessages: SystemMessages = {};

// Save message to the in-memory store
const saveMessage = (chatId: string, role: "system" | "user" | "assistant", content: string): void => {
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

const getCompletion = async (chatId: string) => {
  const history = getChatHistory(chatId);
  
  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: history,
    max_tokens: 200,
    temperature: 0
  });

  return completion.choices[0].message.content; 
};

export const chatTranscribeAudio = async (
  req: RequestWithChatId,
  res: Response
) => {
  //============  variables ================
  const index = pc.index("botdb");
  const namespace = index.namespace("thyaga-data");
  let data = req.body;
  console.log(data);
  let userChatId: string = "";
  let language = data.language || "English";
  let chatHistory: ChatMessage[] = [];
  let context: any;
  let kValue = 2;
  let translatedQuestion = "";
  let voiceName = "en-GB-Standard-A";
  let responsiveLanguage = "";

  try {
    // id setup - if null
    if (data.voiceID === "null") {
      console.log("VoiceID is null");
      userChatId = generateChatId();
      console.log("Generated ID : ", userChatId);
    } else {
      console.log("VoiceID:", data.voiceID);
      userChatId = data.voiceID;
    }

    //============== transcribe audio =====================
    let languageCode = "en-US";
    let transcribedText = "";
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
      console.log(`Transcription Variable: ${transcribedText}`);
    } catch (error) {
      console.error("ERROR:", error);
    }

    //  ===============  translate question and select voice for speak  =============
    if (language == "Sinhala") {
      // languageCode = "si-LK";
      // voiceName = "si-LK-Standard-A";
      responsiveLanguage = "Sinhala";
      // responsiveVoice.speak("hello world", "Sinhala", {volume: 1});

      translatedQuestion = await translateToEnglish(transcribedText);
    } else if (language === "Tamil") {
      languageCode = "ta-IN";
      voiceName = "ta-IN-Standard-C";
      translatedQuestion = await translateToEnglish(transcribedText);
    } else {
      languageCode = "en-GB";
      voiceName = "en-GB-Standard-A";
      translatedQuestion = transcribedText;
    }

    

    console.log("Translated Question", translatedQuestion);

    // ==== set chat history with question and system prompt
    const systemPrompt = `You are a helpful assistant and you are friendly. If the user greets you, respond warmly. Your name is Thyaga GPT. Answer user questions only based on the given context: ${context}. Your answer must be less than 180 tokens. If the user asks for information like your email or address, provide the Thyaga email and address. If your answer has a list, format it as a numbered list.

  For specific questions about available categories (e.g., "What are the choices available in Thyaga?"), provide the relevant categories as listed in the context. If the user asks about Supermarkets using the Thyaga voucher, respond with the information you have available, but clarify if specific details aren't listed.
  
  If the user asks for merchants generically, list the merchant types and ask to specify a category.
  
  For any questions not relevant to the context, provide the best available information based on what you have.
  
  If the user question is not relevant to the context, just say "Sorry, I couldn't find any information. Would you like to chat with a live agent?".
  
  Do NOT make up any answers or provide information not relevant to the context using public information.
  `;

    // if (!chatHistory || chatHistory.length === 0) {
    //   chatHistory = [{ role: "system", content: systemPrompt }];
    // }
    // chatHistory.push({ role: "user", content: translatedQuestion });
    // const chatHistoryString = JSON.stringify(chatHistory);

    //================ in memory store - add messages ====================
    console.log("User Chat ID : ", userChatId);
    saveMessage(userChatId, "system", systemPrompt);
    saveMessage(userChatId, "user", translatedQuestion);

    // Retrieve and log chat history
    const history = getChatHistory(userChatId);
    // console.log(userChatId, " : ", history);

    // Get the last 8 messages
    // const lastEightMessages = history.slice(-5);
    const nonSystemMessages = history.filter(msg => msg.role !== 'system');
    const lastEightMessages = nonSystemMessages.slice(-5);
    
    // Log the last 8 messages
    console.log(userChatId, " last 5 : ", lastEightMessages);

    //================ handle history limit ================
    const lastestMessages = chatHistory.slice(-8);
    const chatHistoryString = JSON.stringify(lastestMessages);
    // const combinedMessages = [...chatHistory, ...last15Messages];
    // const uniqueCombinedMessages = Array.from(
    //   new Map(
    //     combinedMessages.map((item) => [JSON.stringify(item), item])
    //   ).values()
    // );

    // console.log("Limited Chat History : ", uniqueCombinedMessages);

    // =======  generate standalone question =======
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

    // ======  check category =====
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

    // ===== create embeddings ========
    const embedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: completionQuestion.choices[0].text,
    });

    // =========== query pinecone ==========
    let queryResponse: {
      matches: any;
      namespace?: string;
      usage?: OperationUsage | undefined;
    };

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

    // =========== create context string =======
    const results: string[] = [];
    queryResponse.matches.forEach(
      (match: { metadata: { Title: any; Category: any; Text: any } }) => {
        if (match.metadata && typeof match.metadata.Title === "string") {
          const result = `Title: ${match.metadata.Title}, \n Category: ${match.metadata.Category} \n Content: ${match.metadata.Text} \n \n `;
          results.push(result);
        }
      }
    );
    context = results.join("\n");
    // console.log("CONTEXT : ", context);
    
    const completionResponse = await getCompletion(userChatId);

    let botResponse = completionResponse || "";

    // ====== text to speech =======
    let selectedLanguage = "en";
    let translatedResponse = "";

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

    // chatHistory.push({ role: "assistant", content: botResponse });

    // add bot response to history
    saveMessage(userChatId, "assistant", botResponse);

    // ===== text to seech convertion =========
    let audioSrc: string | null;
    if (responsiveLanguage === "Sinhala") {
      console.log("sinhala response");
      audioSrc = null;
    } else {
      const [response] = await textToSpeachClient.synthesizeSpeech({
        input: { text: translatedResponse },
        voice: {
          languageCode: languageCode,
          name: voiceName,
          ssmlGender: "NEUTRAL",
        },
        audioConfig: { audioEncoding: "MP3" },
      });

      const audioContent = response.audioContent.toString("base64");
      audioSrc = `data:audio/mp3;base64,${audioContent}`;
    }

    // ============ response ==================
    res.json({
      userText: transcribedText,
      answer: botResponse,
      chatHistory: chatHistory,
      chatId: userChatId,
      audioSrc: audioSrc,
    });
  } catch (error) {
    console.error("Error processing question:", error);
    res.status(500).json({ error: "An error occurred." });
  }
};


// id generate function
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

// translate to english function
async function translateToEnglish(userQuestion: string) {
  const [translationsToEng] = await translate.translate(userQuestion, "en");
  const finalQuestion = Array.isArray(translationsToEng)
    ? translationsToEng.join(", ")
    : translationsToEng;
  return finalQuestion;
}
