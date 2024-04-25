import {get as dbGet, getDatabase, ref as dbRef, set as dbSet} from "@firebase/database";
import {firebaseApp} from "@/firebase/config";

export const addUserToChatroom = async (userid: string, chatroom: string) => {
    const database = getDatabase(firebaseApp);
    const userdatas = (await dbGet(dbRef(database, `chatrooms/${chatroom}/userData`)));

    let exists = false;
    if (userdatas) userdatas.forEach((child) => exists = exists || child.val() == userid);
    if (exists) return false;
    const chatidx = (await dbGet(dbRef(database, `user-joined-chatrooms/${userid}`))).size;
    await dbSet(dbRef(database, `user-joined-chatrooms/${userid}/${chatidx}`), chatroom);
    await dbSet(dbRef(database, `chatrooms/${chatroom}/userData/${userdatas.size}`), userid);
    return true;
}