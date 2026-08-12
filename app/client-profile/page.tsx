import { redirect } from "next/navigation";import { getCurrentUser } from "@/lib/dal";
export default async function OwnClientProfile(){const user=await getCurrentUser();redirect(user?.username?`/profile/${user.username}`:"/login")}
