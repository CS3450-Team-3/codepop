export interface ChatbotRequest {
  message: string;
  wrong_drink_phase?: string;
  refund_phase?: string;
  order_num?: string;
  drink_nums?: string;
}

export interface ChatbotResponse {
  responses: unknown;
  wrong_drink_phase: string;
  refund_phase: string;
  order_num: string;
  drink_nums: string;
}
