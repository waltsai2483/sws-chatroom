import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"
import {ChatroomData, Message, MessageType} from "@/app/lobby/LobbyChatroom";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

export const randomID = (length: number) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < length; i++) {
    const char = characters.charAt(Math.floor(Math.random() * characters.length));
    result += (Math.random() < 0.5) ? char.toLowerCase() : char.toUpperCase();
  }
  return result;
}

export const sendNotification = (message: Message, chatroom: ChatroomData) => {
  if ("Notification" in window && Notification.permission === "granted") {
    let body = "";
    if (message.type == MessageType.TEXT) {
      body = `says: ${message.data}`;
    } else if (message.type == MessageType.IMAGE) {
      body = "sends you an image";
    } else if (message.type == MessageType.VIDEO) {
      body = "sends you a video";
    }
    new Notification(`New message from ${chatroom.title}:`, {
      body: `${message.username} ${body}`,
      icon: chatroom.image
    })
  }
}