// src/server.ts
import express, { Request, Response } from "express";
import path from "path";
import indexRouter from "./routes/index";
import { chatResponse } from "./controllers/chatController";
import "dotenv/config";
import bodyParser from "body-parser";
import { viewDocuments } from "./controllers/viewDocumentsController";
import {
  uploadDocuments,
  handleFileUpload,
} from "./controllers/uploadDocumentsController";
import { editDocument } from "./controllers/editDocumentController";
import {
  updateDocuments,
  handleFileUploadUpdate,
} from "./controllers/updateDocumentController";
import { deleteDocument } from "./controllers/deleteDocumentController";
import { login, agent } from "./controllers/loginController";
import { adminLogged } from "./controllers/adminLogged";
import { agentLogged } from "./controllers/agentLogged";
import {
  liveChatsOnload,
  refreshLiveChats,
  replyLiveChats,
  sendReplyLiveChats,
  closeLiveChats,
  refreshLiveChatInner,
} from "./controllers/liveChats";
import {
  liveChat,
  saveRating,
  switchToAgent,
  liveChatUser,
  directConnectAgent,
} from "./controllers/liveChatController";
import session from "express-session";
import flash from "express-flash";
import cookieParser from "cookie-parser";
import ChatHeader from "../models/ChatHeader";
import AgentLanguages from "../models/AgentLanguages";
import {
  adminAccountCreate,
  adminUpdate,
  matchPassword,
  adminUpdateWithPassword,
} from "./controllers/adminAccount";
import {
  agentCreateAccount,
  agentUpdateAccount,
  agentUpdateWithPassword,
} from "./controllers/AgentAccount";
import {
  botChatsOnload,
  botChatsGetMessages,
  botChatsRefresh,
  botChatsRefreshMessage,
} from "./controllers/botChats";
import {
  LiveChatHistoryOnload,
  LiveChatHistoryMessages,
  LiveChatHistoryRefresh,
  LiveChatHistoryRefreshMessages,
} from "./controllers/LiveChatHistory";
import {
  quickQuestionsAdd,
  quickQuestionsEdit,
} from "./controllers/quickQuestions";
import Admin from "../models/Admin";
import QuickQuestion from "../models/QuickQuestion";
import User from "../models/User";
import BotChats from "../models/BotChats";
import Agent from "../models/Agent";
import ChatTimer from "../models/ChatTimer";
import { loadLiveChatHistory } from "./controllers/loadLiveChatHistory";
import { Op } from "sequelize";
import { chatAudioResponse } from "./controllers/chatControllerAudio";
import multer from "multer";
import { chatTranscribeAudioIntergrated } from "./controllers/TranscribeAudio";
import { VoiceSipTrunkBotResponce } from "./controllers/VoiceSipTrunk";
import { chatResponseSip } from "./controllers/chatControllerSipTrunk";
import { CustomizeBotView } from "./controllers/CustomizeBotView";
import { customizeBot } from "./controllers/CustomizeBot";
import { PrismaClient } from '@prisma/client';

import Customize from '../models/Customize';
import { chatTranscribeAudio } from "./controllers/TranscribeAudioIntergrated";
const prisma = new PrismaClient();

const app = express();
app.use(cookieParser()); 
// Set up view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const speech = require("@google-cloud/speech");
const upload = multer();

declare module "express-session" {
  interface SessionData {
    user: any; // Adjust this type according to your User model
  }
}
// public folder
app.use(express.static("public"));
app.use(
  session({
    secret: "dfcc",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());


// Routes
app.use("/", indexRouter);
app.use("/bot", indexRouter);
app.use("/voice-bot", indexRouter);
app.use("/live-agent", indexRouter);
app.use("/voice-and-chat-bot", indexRouter);
app.use("/voice-call", indexRouter);



app.post('/recording-start', upload.single('audio'), chatTranscribeAudio);
app.post('/recording-start-intergrate', upload.single('audio'), chatTranscribeAudioIntergrated);


app.post("/api/chat-response", chatResponse);
app.post("/chat-response-sip", chatResponseSip);
app.post("/voice-chat-response", chatAudioResponse);
app.post("/live-chat-agent", liveChat);
app.post("/live-chat-user", liveChatUser);
app.post("/switch-to-live-agent", switchToAgent);
app.post("/direct-connect-live-agent", directConnectAgent);
app.post("/save-rating", saveRating);
app.get("/view-documents", adminLogged, viewDocuments);
app.get("/upload-documents", adminLogged, (req: Request, res: Response) => {
  res.render("upload-documents");
});
app.get("/edit-document", adminLogged, editDocument);


// app.get("/view-documents-all", adminLogged, CustomizeBotView);

// app.get('/view-documents-all', adminLogged, async (req, res) => {
//   try {
//       const [customizations] = await db.query('SELECT bot_Name, color, select_image FROM customize');
//       res.render('customize', { customizations });
//   } catch (err) {
//       console.error(err);
//       res.status(500).send('Server Error');
//   }
// });



app.use(express.static(path.join(__dirname, "public")));


app.get("/view-documents-all", adminLogged, (req: Request, res: Response) => {
  res.render("customization");
});



// Define the route for customization
app.post('/view-documents-all', customizeBot);

app.post("/bot-customization", handleFileUpload , customizeBot);


app.post("/voice-call-bot", VoiceSipTrunkBotResponce);



app.post("/upload-documents", handleFileUpload, uploadDocuments);

app.post("/update-document", handleFileUploadUpdate, updateDocuments);

app.get("/delete-document", adminLogged, deleteDocument);

app.get("/login", (req: Request, res: Response) => {
  const successMessage = req.flash("success")[0];
  const errorMessage = req.flash("error")[0];
  res.render("login", {
    successMessage: successMessage,
    errorMessage: errorMessage,
  });
});
app.post("/login", login);

app.get("/admin-dashboard", adminLogged, (req: Request, res: Response) => {
  res.render("admin-dashboard");
});
app.get("/add-admin", adminLogged, (req: Request, res: Response) => {
  res.render("add-admin");
});
app.post("/admin-add", adminAccountCreate);
app.get("/manage-admins", adminLogged, async (req: Request, res: Response) => {
  const admins = await prisma.admin.findMany({});
  res.render("manage-admins", { admins: admins });
});
app.get(
  "/deactivate-admin/:id",
  adminLogged,
  async (req: Request, res: Response) => {
    let user_id =  parseInt(req.params.id, 10);;

    await prisma.admin.updateMany({
      where: { user_id: user_id },
      data: { status: "inactive" },
    });
    await prisma.user.updateMany({
      where: { id: user_id },
      data: { status: "inactive" },
    });
    res.redirect("/manage-admins");
  }
);
app.get(
  "/activate-admin/:id",
  adminLogged,
  async (req: Request, res: Response) => {
let user_id =  parseInt(req.params.id, 10);
    await prisma.admin.updateMany({
      where: { user_id: user_id },
      data: { status: "active" },
    });
    await prisma.user.updateMany({
      where: { id: user_id },
      data: { status: "active" },
    });
    res.redirect("/manage-admins");
  }
);
app.get("/edit-admin", adminLogged, async (req: Request, res: Response) => {
  let user_id: number | undefined = parseInt(req.query.id as string, 10);

  const admin_details = await prisma.admin.findFirst({
    where: {
      user_id: user_id,
    },
  });
  const login_details = await prisma.user.findFirst({
    where: {
      id: user_id,
    },
  });
  res.render("edit-admin", {
    admin_details: admin_details,
    login_details: login_details,
  });
});
app.post("/admin-update", adminLogged, adminUpdate);
app.post("/user-check-current-password", matchPassword);
app.post("/admin-update-with-password", adminUpdateWithPassword);
app.get("/agent", (req: Request, res: Response) => {
  const successMessage = req.flash("success")[0];
  const errorMessage = req.flash("error")[0];
  res.render("agent", {
    successMessage: successMessage,
    errorMessage: errorMessage,
  });
});
app.get(
  "/conversation-history",
  adminLogged,
  async (req: Request, res: Response) => {
    const chats = await prisma.botChats.groupBy({
      by: ["message_id"],
      _count: {
        message_id: true,
      },
    });
    res.render("conversation-history", { chats: chats });
  }
);
app.post("/bot-chats-onload", adminLogged, botChatsOnload);
app.post("/get-chat-messages", adminLogged, botChatsGetMessages);
app.post("/refresh-chats", adminLogged, botChatsRefresh);
app.post("/refresh-selected-chat", adminLogged, botChatsRefreshMessage);
app.get(
  "/live-chat-history",
  adminLogged,
  async (req: Request, res: Response) => {
    res.render("live-chat-history");
  }
);
app.post("/load-live-chat-history", adminLogged, loadLiveChatHistory);
app.get(
  "/view-agent-chats",
  adminLogged,
  async (req: Request, res: Response) => {
      let agent_id: number | undefined = parseInt(req.query.id as string, 10);
      let agent_id_text: string = req.query.id as string;

    const agent = await  prisma.agent.findMany({
      where: {
        user_id: agent_id,
      },
    });
    const chat_count = await  prisma.chatHeader.count({
      where: {
        agent: agent_id_text
      },
    });
    const timer = await  prisma.chatTimer.findMany({
      where: {
        agent: agent_id,
      },
    });
    const chats = await prisma.chatHeader.findMany({
      where: {
        agent: agent_id_text,
      },
    });
    res.render("view-agent-chats", {
      agent: agent,
      chat_count: chat_count,
      timer: timer,
      chats: chats,
    });
  }
);
app.post("/onload-live-chat-history-chats", LiveChatHistoryOnload);
app.post("/get-agent-live-chat-messages", LiveChatHistoryMessages);
app.post("/refresh-live-agent-chats", LiveChatHistoryRefresh);
app.post("/refresh-selected-agent-live-chat", LiveChatHistoryRefreshMessages);
app.get(
  "/view-agent-feedbacks",
  adminLogged,
  async (req: Request, res: Response) => {
    let agent_id: number | undefined = parseInt(req.query.id as string, 10);
    let agent_id_text: string = req.query.id as string;
  

    const agent = await prisma.agent.findMany({
      where: {
        user_id: agent_id,
      },
    });
    const chats = await prisma.chatHeader.findMany({
      where: {
        agent: agent_id_text,
        feedback: {
          not: null,
        },
      },
    });
    res.render("view-agent-feedbacks", { agent: agent, chats: chats });
  }
);
app.get("/add-agent", adminLogged, (req: Request, res: Response) => {
  const successMessage = req.flash("success")[0];
  const errorMessage = req.flash("error")[0];
  res.render("add-agent", {
    successMessage: successMessage,
    errorMessage: errorMessage,
  });
});
app.post("/agent-add", agentCreateAccount);
app.get('/manage-agents',adminLogged, async (req: Request, res: Response) => {
  const agents = await prisma.agent.findMany({});
  res.render('manage-agents', {agents: agents});
});
  app.get('/deactivate-agent/:id', adminLogged, async (req: Request, res: Response) => {
    //let user_id: number | undefined = parseInt(req.query.id as string, 10);
    let user_id =  parseInt(req.params.id, 10);;
    await prisma.agent.updateMany({
        where: { user_id: user_id },
        data: { status: "inactive" },
      });
    await prisma.user.updateMany({
        where: { id: user_id },
        data: { status: "inactive" },
      });  

    res.redirect("/manage-agents");
});
app.get('/activate-agent/:id', adminLogged, async (req: Request, res: Response) => {
  //let user_id: number | undefined = parseInt(req.query.id as string, 10);
  let user_id =  parseInt(req.params.id, 10);;
  await prisma.agent.updateMany({
      where: { user_id: user_id },
      data: { status: "active" },
    });
  await prisma.user.updateMany({
      where: { id: user_id },
      data: { status: "active" },
    });  

  res.redirect("/manage-agents");
});
app.get('/edit-agent', adminLogged, async (req: Request, res: Response) => {
  let user_id: number | undefined = parseInt(req.query.id as string, 10);

  const agent_details = await prisma.agent.findFirst({
    where: { user_id: user_id },
  });
  const login_details = await prisma.user.findFirst({
    where: { id: user_id },
  });
  const languages = await prisma.agentLanguages.findMany({where: {user_id : user_id,}});

  res.render('edit-agent', {agent_details: agent_details,login_details: login_details,languages: languages});
});

app.post("/agent-update", agentUpdateAccount);
app.post("/agent-update-with-password", agentUpdateWithPassword);
app.post("/agent", agent);
app.get("/agent-dashboard", agentLogged, (req: Request, res: Response) => {
  res.render("agent-dashboard");
});
app.get(
  "/quick-questions",
  adminLogged,
  async (req: Request, res: Response) => {
    const successMessage = req.flash("success")[0];
    const errorMessage = req.flash("error")[0];
    const questions = await prisma.quickQuestion.findMany({});

    res.render("quick-questions", {
      successMessage: successMessage,
      errorMessage: errorMessage,
      questions: questions,
    });
  }
);
app.get('/go-offline',agentLogged, async (req: Request, res: Response) => {
  let id: number | undefined = parseInt(req.query.id as string, 10);

  await prisma.user.updateMany({
    where: { id: id },
    data: { online_status: "offline" },
  });  

  res.redirect('agent-dashboard');
});

app.get('/go-online',agentLogged, async (req: Request, res: Response) => {
  let id: number | undefined = parseInt(req.query.id as string, 10);

  await prisma.user.updateMany({
    where: { id: id },
    data: { online_status: "online" },
  });  
  res.redirect('agent-dashboard');
});
app.post("/quick-questions", quickQuestionsAdd);
app.get(
  "/delete-question/:id",
  adminLogged,
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await prisma.quickQuestion.delete({ where: { id: id } });
    req.flash("success", `Question Deleted`);
    res.redirect("/quick-questions");
  }
);
app.get("/edit-question", adminLogged, async (req: Request, res: Response) => {
  const successMessage = req.flash("success")[0];
  const errorMessage = req.flash("error")[0];
  const id = parseInt(req.query.id as string, 10);
  const question_details = await prisma.quickQuestion.findFirst({
    where: {
      id: id,
    },
  });
  res.render("edit-question", {
    successMessage: successMessage,
    errorMessage: errorMessage,
    question_details: question_details,
  });
});
app.post("/quick-questions-edit", quickQuestionsEdit);
app.get("/live-chats", agentLogged, async (req, res) => {
  //console.log(res.locals.agent_login_details.dataValues);
  const chats = await prisma.chatHeader.findMany({
    where: {
      agent: "unassigned",
      status: "live",
    },
  });
  const languages = await prisma.agentLanguages.findMany({
    where: {
      user_id: res.locals.agent_login_details.id,
    },
  });
  res.render("live-chats", { chats: chats, languages: languages });
});




app.post("/live-chats-onload", liveChatsOnload);
app.post("/refresh-live-chats", refreshLiveChats);
app.post("/reply-to-live-chat", replyLiveChats);
app.post("/agent-reply-live-chat", sendReplyLiveChats);
app.post("/close-live-chat", closeLiveChats);
app.post("/refresh-live-chat-inner", refreshLiveChatInner);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
