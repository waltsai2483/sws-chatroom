"use client";
import {NextPage} from "next";
import {Loader2, CircleX} from "lucide-react";
import {getAuth, User} from "@firebase/auth";
import {firebaseApp} from "@/firebase/config";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {get as dbGet, getDatabase, ref as dbRef} from "@firebase/database";
import {QueryClient, QueryClientProvider, useQuery} from "react-query";

type UserData = {
    username: string,
    avatar: string | null
}

const queryClient = new QueryClient();

const LobbyState = () => {
    const router = useRouter();
    const [user, setUser] = useState<User | null>();
    const {data: userData, isLoading, error} = useQuery<UserData | undefined>({
        queryKey: ["user-auth", user],
        queryFn: async (context) => {
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

    getAuth(firebaseApp).onAuthStateChanged(async (usr) => {
        setUser(usr);
    });

    useEffect(() => {
        if (user === null) {
            router.push('/login');
        }
    }, [router, user]);

    if (userData === undefined || isLoading) {
        return <div className="w-screen h-screen flex flex-col justify-center items-center">
            <Loader2 className="flex w-10 h-10 animate-spin"/>
            <span className="my-3 ml-2 text-lg">Loading...</span>
        </div>
    }
    if (error) {
        return <div className="w-screen h-screen flex flex-col justify-center items-center">
            <CircleX className="flex w-16 h-16"/>
            <span className="my-3 ml-1 text-lg">{error.toString()}</span>
        </div>
    }
    return <main className="flex h-screen justify-center items-center">
        {userData.avatar}
    </main>
}

const LobbyPage: NextPage = () => {
    return <QueryClientProvider client={queryClient}>
        <LobbyState/>
    </QueryClientProvider>
}

export default LobbyPage;