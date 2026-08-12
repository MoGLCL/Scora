import { notFound, redirect } from "next/navigation";
import { verifySession, getCurrentUser } from "@/lib/dal";
import EditClientProfilePage from "@/app/client-profile/edit/page";
import EditDeveloperProfilePage from "@/app/profile/edit/page";

export default async function EditOwnProfile({params}:{params:Promise<{username:string}>}){
  const session=await verifySession(); if(!session)redirect("/login");
  const user=await getCurrentUser(); const {username}=await params;
  if(!user?.username || user.username!==username.toLowerCase())notFound();
  return session.role==="developer"?<EditDeveloperProfilePage/>:<EditClientProfilePage/>;
}
