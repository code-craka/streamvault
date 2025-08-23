// Database service exports
export { BaseService } from './base-service'
export { UserService } from './user-service'
export { StreamService } from './stream-service'
export { VODService } from './vod-service'
export { 
  ChatService, 
  ChatRoomService, 
  CustomEmoteService, 
  SuperChatService 
} from './chat-service'

// Import service classes
import { UserService } from './user-service'
import { StreamService } from './stream-service'
import { VODService } from './vod-service'
import { 
  ChatService, 
  ChatRoomService, 
  CustomEmoteService, 
  SuperChatService 
} from './chat-service'

// Service instances
export const userService = new UserService()
export const streamService = new StreamService()
export const vodService = new VODService()
export const chatService = new ChatService()
export const chatRoomService = new ChatRoomService()
export const customEmoteService = new CustomEmoteService()
export const superChatService = new SuperChatService()

// Database utilities
export { MigrationUtils, DevUtils, migrations } from './migration-utils'