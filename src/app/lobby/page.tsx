"use client";
import {NextPage} from "next";
import {Loader2, CircleX} from "lucide-react";
import {getAuth, User} from "@firebase/auth";
import {firebaseApp} from "@/firebase/config";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {get as dbGet, getDatabase, onValue, ref as dbRef} from "@firebase/database";
import {QueryClient, QueryClientProvider, useQuery} from "react-query";
import LobbyChatroom, {ChatroomData} from "@/app/lobby/LobbyChatroom";

export type UserData = {
    username: string,
    avatar: string
}

const queryClient = new QueryClient();

const LobbyState = () => {
    const router = useRouter();
    const [user, setUser] = useState<User | null>();
    const [loadingMessage, setLoadingMessage] = useState("");
    const {data: userData, isLoading: userLoading, error: userError} = useQuery<UserData | undefined>({
        queryKey: ["user-auth", user],
        queryFn: async () => {
            if (!user) {
                return undefined;
            }
            const datas = await dbGet(dbRef(getDatabase(firebaseApp), `users/${user.uid}`));
            let avatarUrl = datas.val().avatar;
            return {
                username: datas.val().username,
                avatar: avatarUrl
            };
        },
        refetchInterval: 60 * 1000
    });

    const {data: joinedChatrooms, isLoading: roomLoading, error: roomError} = useQuery<ChatroomData[]>({
        queryKey: ["joined-chatroom", user],
        queryFn: async () => {
            const db = getDatabase(firebaseApp);
            const chatroomList: ChatroomData[] = [];
            onValue(dbRef(db, `user-joined-chatrooms/${user?.uid}`), async (snapshot) => {
                const roomID = snapshot.val();
                const chatroom = await dbGet(dbRef(db, `chatrooms/${roomID}`));
                chatroomList.push(chatroom.val() as ChatroomData);
            });
            return chatroomList;
        }
    });


    getAuth(firebaseApp).onAuthStateChanged(async (usr) => {
        setUser(usr);
    });

    useEffect(() => {
        if (user === null) {
            router.push('/login');
        }
    }, [router, user]);

    if (!user || userData === undefined || userLoading) {
        return <div className="w-screen h-screen flex flex-col justify-center items-center">
            <Loader2 className="flex w-10 h-10 animate-spin"/>
            <span className="my-3 ml-2 text-lg">Loading...</span>
        </div>
    }
    if (userError) {
        return <div className="w-screen h-screen flex flex-col justify-center items-center">
            <CircleX className="flex w-16 h-16"/>
            <span className="my-3 ml-1 text-lg">{userError.toString()}</span>
        </div>
    }

    return <div>
        <div className={`absolute top-[calc(50%-144px)] left-[calc(50%-120px)] z-10 w-60 h-72 bg-gray-900 shadow-md rounded-md border flex flex-col justify-end ${loadingMessage.length > 0 ? "visible" : "invisible"}`}>
            <Loader2 className="absolute w-14 h-14 left-[86px] top-24 animate-spin"/>
            <div className="flex flex-row w-full justify-center my-8 font-semibold opacity-90">{loadingMessage}</div>
        </div>
        <div className={loadingMessage.length > 0 ? "blur-sm pointer-events-none cursor-none" : ""}><LobbyChatroom user={user} userData={userData} setLoading={setLoadingMessage}/>
        </div>
    </div>
}

const LobbyPage: NextPage = () => {
    return <QueryClientProvider client={queryClient}>
        <LobbyState/>
    </QueryClientProvider>
}

export default LobbyPage;