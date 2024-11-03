import {Conversation} from "../models/conversation.model.js"
import { Message } from "../models/message.model.js";

// for chat communication

export const sendMessage= async (req,resp)=> {
    try{
        const senderId= req.id;
        const receiverId= req.params.id;
        const {message}= req.body;

        let conversation= await Conversation.findOne({
            participants:{$all:[senderId, receiverId]}
        });
        // establish the conversation if not started till now
        if(!conversation){
            conversation= await Conversation.create({
                participants:[senderId, receiverId]
            })
        }
        const newMessage= await Message.create({
            senderId,
            receiverId,
            message
        });
        if(newMessage) conversation.messages.push(newMessage._id);
        await Promise.all([conversation.save(), newMessage.save()])

        // implement  socket.io for real time data transfer
        // here, we r going to implement one-to-one communication (i.e, individual messaging)

        return resp.status(201).json({
            success: true,
            newMessage
        })
    }catch(error){
        console.log(error);
    }
}

export const getMessage= async( req,resp)=>{
    try{
        const senderId= req.id;
        const receiverId= req.params.id;
        const conversation= await Conversation.find({
            participants:{$all:[senderId, receiverId]}
        });
        if(!conversation){
            return resp.status(200).json({
                success: true,
                messages:[]
            })
        };
        return resp.status(200).json({
            success: true,
            messaages: conversation?.messages
        });
    }catch(error){
        console.log(error);
    }
}