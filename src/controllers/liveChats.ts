import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import User from '../../models/User';
import jwt, { JwtPayload } from 'jsonwebtoken';
import ChatHeader from '../../models/ChatHeader';
import LiveChat from '../../models/LiveChat';
import AgentLanguages from '../../models/AgentLanguages';
import ChatTimer from '../../models/ChatTimer';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


interface UserDecodedToken extends JwtPayload {
  id: string;
  
}

export const liveChatsOnload = async (req: Request, res: Response, next: NextFunction) => {

    var chat = ''
    let agent_id = req.body.agent_id;
    const chats  = await prisma.chatHeader.findMany({where: { agent: "unassigned", status: "live" }, orderBy: { id: 'desc' }  });  
    const languages  = await prisma.agentLanguages.findMany({where: { user_id: agent_id }  }); 

    for (var i = 0; i < chats.length; i++) {
        const newMessageCount = await prisma.liveChat.count({
            where: {
              viewed_by_agent: 'no',
              message_id: chats[i].message_id,
            },

          });
          const lastMessage = await prisma.liveChat.findFirst({
            where: {
              message_id: chats[i].message_id,
            },
           orderBy: { id: 'desc' }  });
          
          let time = "";
          let message = "";
          if(lastMessage){
            const timestamp = new Date(`${lastMessage.created_at}`);
            time = timestamp.toLocaleTimeString([], { timeStyle: 'short' });
            message = lastMessage.message.slice(0, 30);
          }
    //     for (var c = 0; c < languages.length; c++){
    //         if(languages[c].language == chats[i].language){
    //             chat += `<div class="p-20 bb-1 d-flex align-items-center justify-content-between pull-up">
    //             <div class="d-flex align-items-center">
    //                 <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light" src="../images/avatar/avatar-1.png" alt="..."></a>
    //                 <div>
    //                   <a class="hover-primary mb-5" href="#"><strong>#`+chats[i].message_id+`</strong></a>
    //                   <p class="mb-0">`+message+` ...</p>
    //                   <button type="button" class="waves-effect waves-light btn btn-success mb-5 btn-sm" onclick="ReplayToLiveChat('`+chats[i].message_id+`')">REPLY</button>
    //                 </div>
    //             </div>
    //             <div class="text-end">
    //               <span class="d-block mb-5 fs-12">`+time+`</span>`
    //             if(newMessageCount > 0){
    //             chat += `<span class="badge badge-primary">`+newMessageCount+`</span>`
    //             } 
    //             chat += `</div>
    //         </div>`
    // }
    // }
    for (var c = 0; c < languages.length; c++) {
      let botLanguage;
      if (chats[i].language) {
          botLanguage = chats[i].language;
      }
  
      if (botLanguage && languages[c].language.toLowerCase() === botLanguage.toLowerCase()) {
          chat += `<div class="p-20 bb-1 d-flex align-items-center justify-content-between pull-up">
              <div class="d-flex align-items-center">
                  <a class="me-15 avatar avatar-lg" href="#"><img class="bg-primary-light" src="../images/avatar/avatar-1.png" alt="..."></a>
                  <div>
                      <a class="hover-primary mb-5" href="#"><strong>#` + chats[i].message_id + `</strong></a>
                      <p class="mb-0">` + message + ` ...</p>
                      <button type="button" class="waves-effect waves-light btn btn-success mb-5 btn-sm" onclick="ReplayToLiveChat('` + chats[i].message_id + `')">REPLY</button>
                  </div>
              </div>
              <div class="text-end">
                  <span class="d-block mb-5 fs-12">` + time + `</span>`;
          if (newMessageCount > 0) {
              chat += `<span class="badge badge-primary">` + newMessageCount + `</span>`;
          }
          chat += `</div>
          </div>`;
      }
  }
    }
    return res.json({status:"success", chats:chat, chatsCount:chats.length})
};


export const refreshLiveChats = async (req: Request, res: Response, next: NextFunction) => {

  var chat = ''
  let agent_id = req.body.agent_id;
  const chats  = await prisma.chatHeader.findMany({
      where: {
          "agent" : "unassigned",
          "status" : "live",
      },
      orderBy: { id: 'desc' }  });

  const languages  = await prisma.agentLanguages.findMany({
      where: {
          "user_id" : agent_id,
      },
  });

  for (var i = 0; i < chats.length; i++) {
      const newMessageCount = await prisma.liveChat.count({
          where: {
            viewed_by_agent: 'no',
            message_id: chats[i].message_id,
          },

        });
        const lastMessage = await prisma.liveChat.findFirst({
          where: {
            message_id: chats[i].message_id,
          },
          orderBy: { id: 'desc' }  });

        let time = "";
        let message = "";
        if(lastMessage){
          const timestamp = new Date(`${lastMessage.created_at}`);
          time = timestamp.toLocaleTimeString([], { timeStyle: 'short' });
          message = lastMessage.message.slice(0, 30);
        }
        
  //     for (var c = 0; c < languages.length; c++){
  //         if(languages[c].language == chats[i].language){
  //             chat += `<div class="p-20 bb-1 d-flex align-items-center justify-content-between pull-up">
  //             <div class="d-flex align-items-center">
  //                 <a class="me-15  avatar avatar-lg" href="#"><img class="bg-primary-light" src="../images/avatar/avatar-1.png" alt="..."></a>
  //                 <div>
  //                   <a class="hover-primary mb-5" href="#"><strong>#`+chats[i].message_id+`</strong></a>
  //                   <p class="mb-0">`+message+` ...</p>
  //                   <button type="button" class="waves-effect waves-light btn btn-success mb-5 btn-sm" onclick="ReplayToLiveChat('`+chats[i].message_id+`')">REPLY</button>
  //                 </div>
  //             </div>
  //             <div class="text-end">
  //               <span class="d-block mb-5 fs-12">`+time+`</span>`
  //             if(newMessageCount > 0){
  //             chat += `<span class="badge badge-primary">`+newMessageCount+`</span>`
  //             } 
  //             chat += `</div>
  //         </div>`
  // }
  // }
  for (var c = 0; c < languages.length; c++) {
    let botLanguage;
    if (chats[i].language) {
        botLanguage = chats[i].language;
    }

    if (botLanguage && languages[c].language.toLowerCase() === botLanguage.toLowerCase()) {
        chat += `<div class="p-20 bb-1 d-flex align-items-center justify-content-between pull-up">
            <div class="d-flex align-items-center">
                <a class="me-15 avatar avatar-lg" href="#"><img class="bg-primary-light" src="../images/avatar/avatar-1.png" alt="..."></a>
                <div>
                    <a class="hover-primary mb-5" href="#"><strong>#` + chats[i].message_id + `</strong></a>
                    <p class="mb-0">` + message + ` ...</p>
                    <button type="button" class="waves-effect waves-light btn btn-success mb-5 btn-sm" onclick="ReplayToLiveChat('` + chats[i].message_id + `')">REPLY</button>
                </div>
            </div>
            <div class="text-end">
                <span class="d-block mb-5 fs-12">` + time + `</span>`;
        if (newMessageCount > 0) {
            chat += `<span class="badge badge-primary">` + newMessageCount + `</span>`;
        }
        chat += `</div>
        </div>`;
    }
}
}
  return res.json({status:"success", chats:chat, chatsCount:chats.length})
};

export const replyLiveChats = async (req: Request, res: Response, next: NextFunction) => {

  let agent_id = req.body.agent_id;
  let message_id = req.body.message_id;
  
  let agent_id_text = String(agent_id);

  await prisma.liveChat.updateMany({
    where: { message_id: message_id},
    data: { viewed_by_agent: 'yes'},
  }); 

  var message_history = ''

  await prisma.chatHeader.updateMany({
    where: { message_id: message_id},
    data: { agent: agent_id_text},
  });

  const chats  = await prisma.liveChat.findMany({
    where: {
        "message_id" : message_id,
    },
    orderBy: { id: 'asc' }  });

  message_history += `<div class="chatbox" id="main-chat-`+message_id+`">
  <div class="chatbox-top">
    <div class="chat-partner-name">
    #`+message_id+`
    </div>
    <div class="chatbox-icons">
        <button type="button" class="waves-effect waves-light btn btn-danger mb-5 btn-xs" onclick="CloseLiveChat('`+message_id+`')">Close Chat</button>     
    </div>      
  </div>
  <div class="chat-messages  inner-live-chats" id="live-chat-inner-`+message_id+`" data-id="`+message_id+`">`

  for (var i = 0; i < chats.length; i++) {
    const timestamp = new Date("'"+chats[i].created_at+"'");
    const formattedDateTime = timestamp.toLocaleString(); 
    if(chats[i].sent_by == "customer"){
        message_history += `<div class="chat-msg user">
        <div class="d-flex align-items-center">
            <span class="msg-avatar">
                <img src="/images/avatar/avatar-1.png" class="avatar avatar-lg">
            </span>
            <div class="mx-10">
                <a href="#" class="text-dark hover-primary fw-bold">Customer</a>
                <p class="text-muted fs-12 mb-0">`+formattedDateTime+`</p>
            </div>
        </div>
        <div class="cm-msg-text">
        `+chats[i].message+`
        </div>
    </div>`
    }
    else if(chats[i].sent_by == "bot"){
        message_history += `<div class="chat-msg self">
        <div class="d-flex align-items-center justify-content-end">
            <div class="mx-10">
                <a href="#" class="text-dark hover-primary fw-bold">Bot</a>
                <p class="text-muted fs-12 mb-0">`+formattedDateTime+`</p>
            </div>
            <span class="msg-avatar">
                <img src="/images/avatar/bot.png" class="avatar avatar-lg">
            </span>
        </div>
        <div class="cm-msg-text">
        `+chats[i].message+`         
        </div>        
    </div>`
    }
    else{
        message_history += `<div class="chat-msg self">
        <div class="d-flex align-items-center justify-content-end">
            <div class="mx-10">
                <a href="#" class="text-dark hover-primary fw-bold">You</a>
                <p class="text-muted fs-12 mb-0">`+formattedDateTime+`</p>
            </div>
            <span class="msg-avatar">
                <img src="../images/avatar/3.jpg" class="avatar avatar-lg">
            </span>
        </div>
        <div class="cm-msg-text">
        `+chats[i].message+`        
        </div>        
    </div>`
    }
  }
  message_history += `</div>
  <div class="chat-input-holder">
  <textarea class="chat-input" id="agent-reply-message-`+message_id+`"></textarea>
  <button type="button" class="waves-effect waves-light btn btn-success mb-5 btn-sm" onclick="ReplyChat('`+message_id+`')">Send</button>     
  </div>`
  return res.json({status:"success", message:message_history})
};


export const sendReplyLiveChats = async (req: Request, res: Response, next: NextFunction) => {

  let reply_message = req.body.reply_message;
  let message_id = req.body.message_id;

  await prisma.liveChat.create({
    data: {
      message_id: message_id,
      sent_by: "agent",
      message: reply_message,
      sent_to_user: "no",
    },
  });
  return res.json({status:"success"})
};

export const closeLiveChats = async (req: Request, res: Response, next: NextFunction) => {

  let message_id = req.body.chatId;

  await prisma.chatHeader.updateMany({
    where: { message_id: message_id},
    data: { status: "closed" },
  });
  return res.json({status:"success"})
};
export const refreshLiveChatInner = async (req: Request, res: Response, next: NextFunction) => {

  let message_id = req.body.message_id;
  let agent_id = req.body.agent_id;
  
  const timer  = await prisma.chatTimer.findMany({
    where: {
        "message_id" : message_id,
    }
  });
  if(!timer[0]){
    await prisma.chatTimer.create({
      data: {
        message_id: message_id,
        agent: agent_id,
        time:1,
      },
    });
  }
  else{
    await prisma.chatTimer.updateMany({
      where: { message_id: message_id},
      data: { time: timer[0].time+1 },
    });
  }
  var message_history = ''
  const chats  = await prisma.liveChat.findMany({
    where: {
        "message_id" : message_id,
    },
    orderBy: { id: 'asc' }  });

  for (var i = 0; i < chats.length; i++) {
    const timestamp = new Date("'"+chats[i].created_at+"'");
    const formattedDateTime = timestamp.toLocaleString(); 
    if(chats[i].sent_by == "customer"){
        message_history += `<div class="chat-msg user">
        <div class="d-flex align-items-center">
            <span class="msg-avatar">
                <img src="/images/avatar/avatar-1.png" class="avatar avatar-lg">
            </span>
            <div class="mx-10">
                <a href="#" class="text-dark hover-primary fw-bold">Customer</a>
                <p class="text-muted fs-12 mb-0">`+formattedDateTime+`</p>
            </div>
        </div>
        <div class="cm-msg-text">
        `+chats[i].message+`
        </div>
    </div>`
    }
    else if(chats[i].sent_by == "bot"){
        message_history += `<div class="chat-msg self">
        <div class="d-flex align-items-center justify-content-end">
            <div class="mx-10">
                <a href="#" class="text-dark hover-primary fw-bold">Bot</a>
                <p class="text-muted fs-12 mb-0">`+formattedDateTime+`</p>
            </div>
            <span class="msg-avatar">
                <img src="/images/avatar/bot.png" class="avatar avatar-lg">
            </span>
        </div>
        <div class="cm-msg-text">
        `+chats[i].message+`         
        </div>        
    </div>`
    }
    else{
        message_history += `<div class="chat-msg self">
        <div class="d-flex align-items-center justify-content-end">
            <div class="mx-10">
                <a href="#" class="text-dark hover-primary fw-bold">You</a>
                <p class="text-muted fs-12 mb-0">`+formattedDateTime+`</p>
            </div>
            <span class="msg-avatar">
                <img src="../images/avatar/3.jpg" class="avatar avatar-lg">
            </span>
        </div>
        <div class="cm-msg-text">
        `+chats[i].message+`        
        </div>        
    </div>`
    }
}
return res.json({status:"success", message:message_history})
};