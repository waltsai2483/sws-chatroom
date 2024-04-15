"use client";
import ThemeButton from "@/components/theme/theme-button";
import {NextPage} from "next";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useEffect, useState} from "react";
import {Separator} from "@/components/ui/separator";
import {firebaseApp} from "@/firebase/config";
import {
    createUserWithEmailAndPassword,
    getAuth,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    signInWithPopup,
    UserCredential
} from "@firebase/auth";
import {PasswordInput} from "@/components/form/PasswordInput";
import {getDatabase, ref as dbRef, set as dbSet} from "@firebase/database";
import {getStorage, ref as stRef, uploadBytes, updateMetadata, getDownloadURL} from "@firebase/storage";
import {useRouter} from "next/navigation";
import AccountAvatar from "@/components/form/AccountAvatar";
import {Dialog, DialogContent, DialogFooter} from "@/components/ui/dialog";
import {Check, Loader2} from "lucide-react";

const LoginPage: NextPage = () => {
    const [isSignup, setSignup] = useState(false);
    const [avatarImage, setAvatarImage] = useState<File | null>(null);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [alert, setAlert] = useState({at: [""], message: ""});
    const [inLoginProcess, setInLoginProcess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setAlert({at: [""], message: ""});
    }, [isSignup]);

    const loginAndStoreDatas = async (credential: UserCredential, avatar: File | string | null = avatarImage, name: string) => {
        const database = getDatabase(firebaseApp);
        const storage = getStorage(firebaseApp);
        if (avatar && typeof avatar !== "string") {
            const ref = stRef(storage, `users/${credential.user.uid}`);
            await uploadBytes(ref, avatar);
            await updateMetadata(ref, {contentType: avatar.type});
            avatar = await getDownloadURL(ref);
        }
        await dbSet(dbRef(database, `users/${credential.user.uid}`), {username: name, avatar: avatar});
    }

    const confirmButtonClick = async () => {
        const auth = getAuth(firebaseApp);
        if (isSignup) {
            if (username && email && password) {
                setInLoginProcess(true);
                createUserWithEmailAndPassword(auth, email, password)
                    .then(async (credential) => {
                        await loginAndStoreDatas(credential, avatarImage, username);
                        setAlert({at: [""], message: "success"});
                        setEmail("");
                        setPassword("");
                    }).catch((err) => {
                    console.log(err.message);
                    if (err.message.includes("auth/invalid-email")) {
                        setAlert({at: ["email"], message: "invalid"});
                        setEmail("");
                    } else if (err.message.includes("auth/email-already-in-use")) {
                        setAlert({at: ["email"], message: "already in use"});
                        setEmail("");
                    } else if (err.message.includes("auth/weak-password")) {
                        setAlert({at: ["password"], message: "less than 6 characters"});
                        setPassword("");
                    }
                }).finally(() => {
                    setInLoginProcess(false);
                });
            } else {
                let arr = [];
                if (!username) {
                    arr.push("username");
                }
                if (!email) {
                    arr.push("email");
                }
                if (!password) {
                    arr.push("password");
                }
                setAlert({at: arr, message: "missing"});
            }
        } else {
            if (email && password) {
                setInLoginProcess(true);
                signInWithEmailAndPassword(auth, email, password).then((credential) => {
                    setAlert({at: [""], message: "success"});
                    router.push("/lobby");
                }).catch((err) => {
                    console.log(err.message);
                    if (err.message.includes("auth/invalid-email")) {
                        setAlert({at: ["email"], message: "invalid"});
                        setEmail("");
                    } else if (err.message.includes("auth/user-not-found")) {
                        setAlert({at: ["email"], message: "not found"});
                        setEmail("");
                    } else if (err.message.includes("auth/wrong-password")) {
                        console.log("test");
                        setAlert({at: ["password"], message: "wrong"});
                        setPassword("");
                    }
                }).finally(() => {
                    setInLoginProcess(false);
                });
            } else {
                const arr = [];
                if (!email) {
                    arr.push("email");
                }
                if (!password) {
                    arr.push("password");
                }
                setAlert({at: arr, message: "missing"});
            }
        }
    };

    const googleButtonclick = () => {
        const auth = getAuth(firebaseApp);
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).then(async (credential) => {
            await loginAndStoreDatas(credential, credential.user.providerData[0].photoURL, credential.user.displayName!);
            router.push("/lobby");
        }).catch((err) => console.log(err)
        )
    }

    getAuth(firebaseApp).onAuthStateChanged((user) => {
        if (user !== null) {
            router.push("/lobby");
        }
    });

    return <main className="flex h-screen justify-center items-center">
        <Dialog open={inLoginProcess}>
            <Card className="w-96 select-none">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        {isSignup ? "Sign up" : "Log in"}
                        <ThemeButton/>
                    </CardTitle>
                    <CardDescription>{isSignup ? "New to this website? Try introduce yourself!" : "We can't wait to see you in our chatroom!"}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full mt-2 bg-white shadow-md text-black items-center hover:bg-gray-50"
                            onClick={googleButtonclick}>
                        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24" height="24"
                             className="mr-2"
                             viewBox="0 0 48 48">
                            <path fill="#FFC107"
                                  d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                            <path fill="#FF3D00"
                                  d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                            <path fill="#4CAF50"
                                  d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                            <path fill="#1976D2"
                                  d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                        </svg>
                        <span className="mr-2">{isSignup ? "Sign up" : "Log in"} with Google</span>
                    </Button>
                    <Separator className="my-6 flex flex-row justify-center items-center"><CardDescription
                        className="px-2 bg-white dark:bg-transparent">Or</CardDescription></Separator>
                    {isSignup &&
                        <div className="flex flex-row justify-center items-center gap-3">
                            <AccountAvatar username={username} avatarImage={avatarImage}
                                           setAvatarImage={setAvatarImage}/>
                            <Input type="text"
                                   placeholder={"Username" + (alert.at.includes("username") ? ` ${alert.message}` : "")}
                                   className={"my-4 h-12" + (alert.at.includes("username") ? " border-spacing-1 border-red-500 !ring-red-500 !ring-offset-0" : "")}
                                   value={username}
                                   onChange={(input) => setUsername(input.target.value)}/>
                        </div>
                    }
                    <Input type="email" placeholder={"Email" + (alert.at.includes("email") ? ` ${alert.message}` : "")}
                           className={"my-4 h-12" + (alert.at.includes("email") ? " border-spacing-1 border-red-500 !ring-red-500 !ring-offset-0" : "")}
                           value={email}
                           onChange={(input) => setEmail(input.target.value)}/>
                    <PasswordInput type="password"
                                   placeholder={"Password" + (alert.at.includes("password") ? ` ${alert.message}` : "")}
                                   className={"my-4 h-12" + (alert.at.includes("password") ? " border-spacing-1 border-red-500 !ring-red-500 !ring-offset-0" : "")}
                                   value={password}
                                   onChange={(input) => setPassword(input.target.value)}/>
                    <Button className="w-full mt-2"
                            onClick={() => confirmButtonClick()}>{(alert.message == "success") ? (<><Check className="h-full w-auto mr-2" />Done!</> ) : (isSignup ? "Sign up" : "Log in")}</Button>
                </CardContent>
                <CardFooter>
                    <CardDescription>{isSignup ? "Already" : "Don't"} have an account? <span
                        onClick={() => setSignup(!isSignup)}
                        className="text-blue-500 underline cursor-pointer">{isSignup ? "Log in" : "Sign up"}</span></CardDescription>
                </CardFooter>
            </Card>
            <DialogContent className="w-60 h-48 justify-center items-end">
                <Loader2 className="absolute w-14 h-14 left-[86px] top-16 animate-spin"/>
                <DialogFooter>
                    Loading...
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </main>;
};

export default LoginPage;