import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { describeEvent, type TrustEventType } from "@scora/trust-core";
import type mysql from "mysql2/promise";
import { pool } from "@/lib/db";

export async function appendTrustEvent(input:{sessionPublicId:string;developerId:number;assessmentPublicId?:string;type:TrustEventType;source:"SERVER"|"AI_SERVICE"|"SANDBOX"|"HUMAN";payload:Record<string,unknown>;occurredAt?:number},conn?:mysql.PoolConnection){
  const db=conn??pool; const [heads]=await db.execute<mysql.RowDataPacket[]>("SELECT chain_position,event_hash FROM trust_events WHERE session_public_id=? ORDER BY chain_position DESC LIMIT 1 FOR UPDATE",[input.sessionPublicId]);
  const head=heads[0] as {chain_position?:number;event_hash?:string}|undefined; const pos=Number(head?.chain_position??0)+1; const now=Date.now(); const eventId=`evt_${randomUUID()}`;
  const body={eventId,tenantId:"scora",sessionId:input.sessionPublicId,developerId:input.developerId,assessmentId:input.assessmentPublicId??null,type:input.type,layer:describeEvent(input.type).layer,source:input.source,sequence:pos,chainPosition:pos,occurredAt:input.occurredAt??now,receivedAt:now,payload:input.payload,previousHash:head?.event_hash??null};
  const hash=createHash("sha256").update(JSON.stringify(body)).digest("hex");
  await db.execute("INSERT INTO trust_events(event_id,tenant_id,session_public_id,developer_id,assessment_public_id,event_type,layer,source,producer_sequence,chain_position,occurred_at,received_at,payload_json,previous_hash,event_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[eventId,"scora",input.sessionPublicId,input.developerId,input.assessmentPublicId??null,input.type,describeEvent(input.type).layer,input.source,pos,pos,input.occurredAt??now,now,JSON.stringify(input.payload),head?.event_hash??null,hash]);
  return eventId;
}
