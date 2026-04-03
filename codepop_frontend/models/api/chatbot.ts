import api from "./api";
import { ChatbotRequest, ChatbotResponse } from "@/models/types/chatbot";

export async function sendChatbotMessage(payload: ChatbotRequest): Promise<ChatbotResponse> {
  const { data } = await api.post("chatbot/", payload);
  return data;
}
