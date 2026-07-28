import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AccessTokenService } from '../../auth/services/access-token.service.js';
import { MembershipsRepository } from '../../memberships/repositories/memberships.repository.js';
import { InboxRepository } from '../repositories/inbox.repository.js';
import { InboxRealtimeService } from './inbox-realtime.service.js';
interface SocketData { userId?:string; workspaceId?:string }
interface JoinPayload { conversationId:string }
interface TypingPayload extends JoinPayload { typing:boolean }
@WebSocketGateway({namespace:'/inbox',cors:false,transports:['websocket','polling']})
export class InboxGateway implements OnGatewayConnection,OnGatewayDisconnect{
 @WebSocketServer()server!:Server;private readonly logger=new Logger(InboxGateway.name);
 constructor(private readonly tokens:AccessTokenService,private readonly memberships:MembershipsRepository,private readonly repository:InboxRepository,private readonly realtime:InboxRealtimeService){}
 afterInit(){this.realtime.bind(this.server)}
 async handleConnection(client:Socket){try{const token=typeof client.handshake.auth.token==='string'?client.handshake.auth.token:'';const workspaceId=typeof client.handshake.auth.workspaceId==='string'?client.handshake.auth.workspaceId:'';const claims=this.tokens.verify(token);const membership=await this.memberships.findActiveMembership(workspaceId,claims.sub);if(!membership)throw new WsException('Workspace access denied');const data=client.data as SocketData;data.userId=claims.sub;data.workspaceId=workspaceId;await client.join(`workspace:${workspaceId}`);this.server.to(`workspace:${workspaceId}`).emit('presence.updated',{userId:claims.sub,state:'online'})}catch{client.disconnect(true)}}
 handleDisconnect(client:Socket){const data=client.data as SocketData;if(data.workspaceId&&data.userId)this.server.to(`workspace:${data.workspaceId}`).emit('presence.updated',{userId:data.userId,state:'offline'})}
 @SubscribeMessage('conversation.join')async join(@ConnectedSocket()client:Socket,@MessageBody()payload:JoinPayload){const data=this.auth(client);await this.repository.conversation(data.workspaceId,payload.conversationId);await client.join(this.room(data.workspaceId,payload.conversationId));return{joined:true}}
 @SubscribeMessage('conversation.leave')async leave(@ConnectedSocket()client:Socket,@MessageBody()payload:JoinPayload){const data=this.auth(client);await client.leave(this.room(data.workspaceId,payload.conversationId));return{left:true}}
 @SubscribeMessage('typing')async typing(@ConnectedSocket()client:Socket,@MessageBody()payload:TypingPayload){const data=this.auth(client);await this.repository.conversation(data.workspaceId,payload.conversationId);client.to(this.room(data.workspaceId,payload.conversationId)).emit('typing.updated',{conversationId:payload.conversationId,userId:data.userId,typing:Boolean(payload.typing)});return{accepted:true}}
 private auth(client:Socket):{workspaceId:string;userId:string}{const data=client.data as SocketData;if(!data.workspaceId||!data.userId)throw new WsException('Unauthenticated');return{workspaceId:data.workspaceId,userId:data.userId}}
 private room(workspaceId:string,conversationId:string){return`workspace:${workspaceId}:conversation:${conversationId}`}
}
