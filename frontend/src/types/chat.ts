// Chat-related types
import { Phone } from '../api/phones';

export interface ChatMessage {
  user: string;
  bot: string;
  phones?: Phone[];
}