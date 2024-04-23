"use client";
import {redirect} from "next/navigation";
import {getAuth} from "@firebase/auth";
import {firebaseApp} from "@/firebase/config";
import {Loader2} from "lucide-react";
import {useEffect, useState} from "react";
import {User} from "firebase/auth";

const Home = () => {
    const [user, setUser] = useState<User | null | undefined>(undefined);
    getAuth(firebaseApp).onAuthStateChanged(async (usr) => {
        setUser(usr);
    });

    useEffect(() => {
        if (user === null) {
            redirect("/login");
        } else if (user !== undefined) {
            redirect("/lobby");
        }
    }, [user]);

    return <div className="w-screen h-screen flex flex-col justify-center items-center">
        <Loader2 className="flex w-10 h-10 animate-spin"/>
        <span className="my-3 ml-2 text-lg">Login and redirecting...</span>
    </div>
}

export default Home;