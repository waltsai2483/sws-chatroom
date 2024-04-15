import {LogOut, MessageCircleMore, Plus, SendHorizonal, Settings, User2} from "lucide-react";
import ThemeButton from "@/components/theme/theme-button";
import {Separator} from "@/components/ui/separator";
import {
    Command, CommandEmpty,
    CommandInput,
} from "@/components/ui/command";
import {User} from "firebase/auth";
import {UserData} from "@/app/lobby/page";
import {useEffect, useState} from "react";
import {useQuery, useQueryClient} from "react-query";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {useRouter} from "next/navigation";
import {getAuth} from "@firebase/auth";
import {firebaseApp} from "@/firebase/config";
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {DialogBody} from "next/dist/client/components/react-dev-overlay/internal/components/Dialog";
import AccountAvatar from "@/components/form/AccountAvatar";
import {Input} from "@/components/ui/input";
import {getDownloadURL, getStorage, ref as stRef, updateMetadata, uploadBytes} from "@firebase/storage";
import {getDatabase, onChildAdded, ref as dbRef, set as dbSet, get as dbGet, onValue} from "@firebase/database";
import {Textarea} from "@/components/ui/textarea";

export const EMPTY_CHATROOM = {id: "", title: "", description: "", image: "", messages: [], userData: []}

export type ChatroomData = {
    id: string,
    title: string,
    description: string,
    image: string,
    messages: Message[],
    userData: string[]
}

export enum MessageType {
    TEXT,
    IMAGE,
    VIDEO
}

export type Message = {
    type: MessageType,
    data: string,
    id: string,
    username?: string,
    userimg?: string,
    date: string
}

const ChatroomBox = ({id, img, title, description, onClick}: {
    id: string,
    img: string,
    title: string,
    description: string,
    onClick: () => void
}) => {
    return <div
        className="h-16 flex flex-row items-center gap-2 ml-1 px-2 rounded-md select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
        onClick={onClick}>
        <Avatar className="w-12 h-12 border">
            <AvatarImage src={img}/>
            <AvatarFallback>{img}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
            <span className="text-md font-semibold">{title}</span>
            <span className="text-sm">{description}</span>
        </div>
    </div>
}

const LobbyChatroom = ({user, userData}: {
    user: User,
    userData: UserData
}) => {
    const [isSettingsOpen, setOpenSettings] = useState(false);
    const [isNewChatroomOpen, setOpenNewChatroom] = useState(false);

    const [avatarImage, setAvatarImage] = useState<File | null | undefined>(null);
    const [chatroomImage, setChatroomImage] = useState<File | null>(null);
    const [chatroomData, setChatroomData] = useState<ChatroomData>(EMPTY_CHATROOM);
    const [username, setUsername] = useState<string>(userData.username);

    const [joinedChatroom, setJoinedChatroom] = useState<ChatroomData[]>([]);
    const [selectedChatroom, setSelectedChatroom] = useState<ChatroomData | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageText, setMessageText] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [userDataList, setUserDataList] = useState<Map<string, UserData>>();

    const router = useRouter();
    const queryClient = useQueryClient();

    const db = getDatabase(firebaseApp);

    useEffect(() => {
        setJoinedChatroom([]);
        onChildAdded(dbRef(db, `user-joined-chatrooms/${user.uid}`), async (snapshot) => {
            const roomID = snapshot.val();
            const chatroom = await dbGet(dbRef(db, `chatrooms/${roomID}`));
            const url = getDownloadURL(stRef(getStorage(firebaseApp), `chatrooms/${roomID}`))
            setJoinedChatroom((prev) => [...prev, {id: roomID, image: url, ...chatroom.val()}]);
        });
    }, [user]);

    useEffect(() => {
        if (!selectedChatroom) return;
        setMessages([]);
        onValue(dbRef(db, `chatrooms/${selectedChatroom.id}/messages`),  (snapshot) => {
            setMessages(snapshot.val());
        });
    }, [selectedChatroom?.messages]);

    useEffect(() => {
        if (!selectedChatroom) return;
        onValue(dbRef(db, `chatrooms/${selectedChatroom.id}/userData`), async (snapshot) => {
            const map = new Map();
            for (let i = 0; i < snapshot.size; i++) {
                const uid = snapshot.child(`${i}`).val()
                const data = (await dbGet(dbRef(db, `users/${uid}`))).val();
                map.set(uid, data);
            }
            setUserDataList(map);
        });
    }, [selectedChatroom?.userData]);

    const logout = () => {
        getAuth(firebaseApp).signOut().then(() => router.replace("/login"));
    }

    const initDialog = (open: boolean) => {
        setOpenSettings(open);
        setAvatarImage(undefined);
    }
    const initChatroomDialog = (open: boolean) => {
        setOpenNewChatroom(open);
        setChatroomImage(null);
        setChatroomData(EMPTY_CHATROOM);
    }

    const updateUserData = async () => {
        let avatar: string | null = null;
        if (avatarImage) {
            const ref = stRef(getStorage(firebaseApp), `users/${user.uid}`);
            await uploadBytes(ref, avatarImage);
            await updateMetadata(ref, {contentType: avatarImage.type});
            avatar = await getDownloadURL(ref);
        }
        await dbSet(dbRef(db, `users/${user.uid}`), {username: username, avatar: avatarImage === undefined ? userData.avatar : avatar});
        await queryClient.invalidateQueries(["user-auth", user]);
    }

    const addNewChatroom = async () => {
        let avatar: string | null = null;
        if (chatroomImage) {
            const ref = stRef(getStorage(firebaseApp), `chatrooms/${chatroomData.id}`);
            await uploadBytes(ref, chatroomImage);
            await updateMetadata(ref, {contentType: chatroomImage.type});
            avatar = await getDownloadURL(ref);
        }
        await dbSet(dbRef(db, `chatrooms/${chatroomData.id}`), {...chatroomData, image: avatar});
    }

    const addNewMessage = async () => {
        if (!selectedChatroom) return;
        setSendingMessage(true);
        const database = db;
        console.log((await dbGet(dbRef(database, `chatrooms/${selectedChatroom.id}`))).val());
        const currentState = (await dbGet(dbRef(database, `chatrooms/${selectedChatroom.id}`))).val() as ChatroomData;
        const messageIdx = (await dbGet(dbRef(database, `chatrooms/${currentState.id}/messages`))).size;
        await dbSet(dbRef(database, `chatrooms/${currentState.id}/messages/${messageIdx}`), {
            type: MessageType.TEXT,
            id: user.uid,
            username: userData.username,
            date: new Date().toISOString(),
            data: messageText,
        });
        setSelectedChatroom(currentState);
        setSendingMessage(false);
    }

    return <main className="flex flex-col h-screen justify-center">
        <Dialog open={isNewChatroomOpen} onOpenChange={(open) => initChatroomDialog(open)}>
            <Dialog open={isSettingsOpen} onOpenChange={(open) => initDialog(open)}>
                <div
                    className="flex flex-row h-16 border-y-2 justify-between items-center text-2xl font-semibold px-3">
                    <div className="flex flex-row gap-2 items-center">
                        <MessageCircleMore className="h-7 w-9 mb-0.5"/>
                        Chatroom
                    </div>
                    <ThemeButton/>
                </div>
                <div className="flex flex-row h-[85%] justify-between">
                    <Command className="rounded-md border w-[420px]">
                        <div className="flex flex-row justify-between items-center w-full gap-1 px-2">
                            <Input type="text" className="w-full" placeholder="Join a chatroom..."/>
                            <Button className="flex gap-1 ml-2 my-2" onClick={() => setOpenNewChatroom(true)}><Plus/><span className="hidden md:flex">Chatroom</span></Button>
                        </div>
                        <div className="flex flex-col h-full overflow-y-scroll overflow-x-hidden py-2 gap-2">
                            {
                                joinedChatroom.length == 0 ?
                                    <CommandEmpty>Join a chatroom and have fun!</CommandEmpty> :
                                    joinedChatroom.map((chatroom) => (
                                        <ChatroomBox key={chatroom.id} id={chatroom.id} img={chatroom.image}
                                                     title={chatroom.title}
                                                     description={chatroom.description}
                                                     onClick={() => setSelectedChatroom(chatroom)}/>))
                            }

                        </div>
                        <div className="h-20 flex flex-row items-center gap-2 px-3 rounded-md border">
                            <Avatar className="w-10">
                                <AvatarImage src={userData.avatar}/>
                                <AvatarFallback>{userData.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col w-full">
                                <span className="text-md font-semibold">{userData.username}</span>
                                <span className="text-sm opacity-70">{user.email}</span>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <Settings className="w-6 m-2"/>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-24">
                                    <DropdownMenuItem onClick={() => setOpenSettings(true)}>
                                        <User2 className="mr-2 h-5 w-5"/>
                                        <span>Account</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => logout()}>
                                        <LogOut className="mr-2 h-5 w-5"/>
                                        <span>Logout</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </Command>
                    <div className="flex flex-col w-full h-full">
                        <div className="h-16 flex flex-row items-center px-3 gap-2 border-b rounded-b-md shadow-sm">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{selectedChatroom?.title[0].toUpperCase()}</AvatarFallback>
                                <AvatarImage src={selectedChatroom?.image}/>
                            </Avatar>
                            <div className="text-md font-semibold">{selectedChatroom?.title}</div>
                        </div>
                        <div className="h-full flex overflow-y-scroll flex-col-reverse p-4">
                            {
                                messages && messages.toReversed().map((message, index) => {
                                    if (messages.toReversed()[index + 1]?.id == message.id) {
                                        return <span key={`${selectedChatroom?.id}-${index}`}
                                                     className={`text-sm ml-[52px] ${messages.toReversed()[index + 2]?.id == message.id ? "mt-1" : ""}`}>{message.data}</span>;
                                    }
                                    return <div key={`${selectedChatroom?.id}-${index}`}
                                                className={`flex flex-row items-start gap-3 mt-3`}>
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback>{selectedChatroom?.title[0].toUpperCase()}</AvatarFallback>
                                            <AvatarImage src={userDataList?.get(message.id)?.avatar}/>
                                        </Avatar>
                                        <div className="flex flex-col relative -top-1">
                                            <span
                                                className="text-md font-semibold text-gray-700 dark:text-gray-300">{userDataList?.get(message.id)?.username}</span>
                                            <span className="text-sm">{message.data}</span>
                                        </div>
                                    </div>
                                })
                            }
                        </div>
                        <div className="flex flex-row w-full px-2 gap-4 items-center">
                            <Textarea className="min-h-[68px] max-h-[68px] overflow-y-hidden" value={messageText}
                                      onChange={(input) => setMessageText(input.target.value)}></Textarea>
                            <Button className="w-20 h-[60px]" onClick={async () => await addNewMessage()}
                                    disabled={sendingMessage}>
                                <SendHorizonal/>
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Account Settings</DialogTitle>
                        <DialogDescription>Change your username and avatar here.</DialogDescription>
                    </DialogHeader>
                    <DialogBody className="px-1">
                        <div className="flex flex-row items-center gap-2">
                            <AccountAvatar username={userData.username} defAvatarUrl={userData.avatar}
                                           avatarImage={avatarImage} setAvatarImage={setAvatarImage}/>
                            <Input type="text" placeholder="Username" value={username}
                                   onChange={(input) => setUsername(input.target.value)}/>
                        </div>
                    </DialogBody>
                    <DialogClose asChild>
                        <Button className="w-full" onClick={() => updateUserData()}>Confirm</Button>
                    </DialogClose>
                </DialogContent>
            </Dialog>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Chatroom</DialogTitle>
                    <DialogDescription>Add a new chatroom.</DialogDescription>
                </DialogHeader>
                <DialogBody className="flex flex-col items-center px-1 gap-2">
                    <AccountAvatar username={chatroomData?.title ?? ""}
                                   avatarImage={chatroomImage} setAvatarImage={setChatroomImage}/>
                    <Input disabled={true} type="text" placeholder="ID" value={chatroomData?.id}/>
                    <Input type="text" placeholder="Title" value={chatroomData?.title}
                           onChange={(input) => {
                               setChatroomData({...chatroomData, title: input.target.value, id: input.target.value.replace(" ", "-").toLowerCase()});
                           }}/>
                    <Input type="text" placeholder="Description" value={chatroomData?.description}
                           onChange={(input) => setChatroomData({...chatroomData, description: input.target.value})}/>
                </DialogBody>
                <DialogClose asChild>
                    <Button className="w-full" onClick={() => addNewChatroom()}>Add Chatroom</Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    </main>
}

export default LobbyChatroom;