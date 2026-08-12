"use server";

import { z } from "zod";
import { queryOne, transaction } from "@/lib/db";
import { verifySession } from "@/lib/dal";

const MessageSchema=z.object({receiverId:z.coerce.number().int().positive(),body:z.string().trim().min(1).max(5000)});

export async function sendMessage(input:{receiverId:number|string;body:string}){
  const session=await verifySession(); if(!session)return{ok:false as const,error:"سجل الدخول أولاً"};
  const parsed=MessageSchema.safeParse(input); if(!parsed.success)return{ok:false as const,error:parsed.error.issues[0]?.message||"رسالة غير صالحة"};
  if(parsed.data.receiverId===session.userId)return{ok:false as const,error:"لا يمكنك مراسلة نفسك"};
  const receiver=await queryOne<{id:number;role:"developer"|"client"}>("SELECT u.id,u.role FROM users u LEFT JOIN developers d ON d.user_id=u.id WHERE u.id=? AND u.status='active' AND u.onboarding_completed_at IS NOT NULL AND (u.role='client' OR d.approval_status='approved')",[parsed.data.receiverId]);
  if(!receiver)return{ok:false as const,error:"المستخدم غير متاح"};
  if(session.role===receiver.role)return{ok:false as const,error:"المحادثات متاحة بين المطور والعميل فقط"};
  const message = await transaction(async c=>{const [inserted]=await c.execute("INSERT INTO messages(sender_id,receiver_id,body) VALUES(?,?,?)",[session.userId,receiver.id,parsed.data.body]);await c.execute("INSERT INTO notifications(user_id,body) VALUES(?,?)",[receiver.id,"لديك رسالة جديدة"]);return {id:Number((inserted as {insertId:number}).insertId),body:parsed.data.body,createdAt:new Date().toISOString(),senderId:session.userId}});
  return{ok:true as const,message};
}

export async function markConversationRead(otherUserId:number){const session=await verifySession();if(!session)return;await import("@/lib/db").then(({execute})=>execute("UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=?",[otherUserId,session.userId]));}
