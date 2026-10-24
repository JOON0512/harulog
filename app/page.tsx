import { getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath } from './chatgpt-auth';
import { koreaToday } from '@/lib/harulog';
import Harulog from './harulog';
export const dynamic='force-dynamic';
export default async function Home(){
  const user=await getChatGPTUser();
  return <Harulog signedIn={!!user} signInUrl={chatGPTSignInPath('/')} signOutUrl={chatGPTSignOutPath('/')} today={koreaToday()}/>;
}
