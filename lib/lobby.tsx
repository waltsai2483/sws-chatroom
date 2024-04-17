import {get as dbGet, getDatabase, push as dbPush, ref as dbRef, set as dbSet} from "@firebase/database";
import {firebaseApp} from "@/firebase/config";

export const addUserToChatroom = async (userid: string, chatroom: string) => {
    const database = getDatabase(firebaseApp);
    const useridx = (await dbGet(dbRef(database, `chatrooms/${chatroom}/userData`))).size;
    const chatidx = (await dbGet(dbRef(database, `user-joined-chatrooms/${userid}`))).size;
    await dbSet(dbRef(database, `user-joined-chatrooms/${userid}/${chatidx}`), chatroom);
    await dbSet(dbRef(database, `chatrooms/${chatroom}/userData/${useridx}`), userid);
}