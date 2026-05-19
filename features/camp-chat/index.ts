// features/camp-chat/index.ts
export { campChatApi } from './api/camp-chat-api';
export type {
  CampChatAuthor,
  CampChatMessage,
  CampChatPage,
} from './api/camp-chat-api';
export { useCampChat } from './hooks/use-camp-chat';
export { useSendCampChat } from './hooks/use-send-camp-chat';
