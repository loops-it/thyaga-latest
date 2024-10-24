import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import User from '../../models/User';
import jwt, { JwtPayload } from 'jsonwebtoken';
import ChatHeader from '../../models/ChatHeader';
import LiveChat from '../../models/LiveChat';
import AgentLanguages from '../../models/AgentLanguages';
import ChatTimer from '../../models/ChatTimer';
import Agent from '../../models/Agent';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
interface UserDecodedToken extends JwtPayload {
  id: string;
  
}

export const loadLiveChatHistory = async (req: Request, res: Response, next: NextFunction) => {
    var agent_details = ` <table id="example1" class="table table-bordered table-striped">
    <thead>
        <tr>
            <th>Agent Name</th>
            <th>No of Chats</th>
            <th>Total Chat Time (Minutes)</th>
            <th>Average Chat Time (Minutes)</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody>`
    const agents = await prisma.agent.findMany();

    for (var i = 0; i < agents.length; i++) {
   
      let agent_id_text: string = agents[i].user_id.toString();
      const agent_name = agents[i].name;
      const chat_count =  await prisma.chatHeader.count({where: { agent: agent_id_text }  });
     
      const timer = await prisma.chatTimer.findMany({where: { agent: agents[i].user_id }  });
      
      var timer_total = 0;
          
      if(timer[0]){
      for (var c = 0; c < timer.length; c++) {
            timer_total = ((timer_total + timer[c].time))
      }
      }
      agent_details += `<tr><td>`+agent_name+`</td><td>`+chat_count+`</td><td>`+(timer_total/60).toFixed(2)+`</td>
      <td>`+((timer_total/60)/chat_count).toFixed(2)+`</td><td> <div class="clearfix">
      <a href="/view-agent-chats?id=`+agents[i].user_id+`"><button type="button" class="waves-effect waves-light btn btn-info mb-5 btn-xs">View Chats</button></a>
      <a href="/view-agent-feedbacks?id=`+agents[i].user_id+`"><button type="button" class="waves-effect waves-light btn btn-primary mb-5 btn-xs">View feedbacks</button></a>
  </div></td>`
    }
    
      agent_details += '</tbody> </table>'  
     
      return res.json({status:"success", message:agent_details})
};

