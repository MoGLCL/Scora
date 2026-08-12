"use server";
import { z } from "zod";
import { execute } from "@/lib/db";
import { verifySession } from "@/lib/dal";
const Schema=z.object({subject:z.string().trim().min(3).max(255),description:z.string().trim().min(10).max(5000),category:z.string().trim().min(2).max(100)});
export async function createSupportTicket(input:{subject:string;description:string;category:string}){const session=await verifySession();if(!session)return{ok:false as const,error:"سجل الدخول أولاً"};const p=Schema.safeParse(input);if(!p.success)return{ok:false as const,error:p.error.issues[0]?.message||"بيانات غير صالحة"};const result=await execute("INSERT INTO support_tickets (user_id,category,subject,description) VALUES (?,?,?,?)",[session.userId,p.data.category,p.data.subject,p.data.description]);return{ok:true as const,id:result.insertId};}
