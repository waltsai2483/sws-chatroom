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
import Marquee from "react-fast-marquee";
import {addUserToChatroom} from "../../../lib/lobby";

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

const ChatroomBox = ({id, img, title, description, onClick, open}: {
    id: string,
    img: string,
    title: string,
    description: string,
    onClick: () => void,
    open: boolean
}) => {
    return <div
        className={`h-16 flex flex-row items-center gap-2 ml-1 px-2 rounded-md select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 ${open ? "bg-gray-50 dark:bg-gray-900" : ""}`}
        onClick={onClick}>
        <Avatar className="w-12 h-12 border">
            <AvatarImage src={img}/>
            <AvatarFallback>{img}</AvatarFallback>
        </Avatar>
        {
            open ?         <div className="flex flex-col">
                <span className="text-md font-semibold">{title}</span>
                <Marquee className="text-sm gap-5" speed={20}>{description}</Marquee>
            </div> : ""
        }
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

    const [searchedChatroom, setSearchedChatroom] = useState<ChatroomData[]>([]);
    const [searchText, setSearchText] = useState("");

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();
    const queryClient = useQueryClient();

    const db = getDatabase(firebaseApp);

    useEffect(() => {
        const db = getDatabase(firebaseApp)
        setJoinedChatroom([]);
        onChildAdded(dbRef(db, `user-joined-chatrooms/${user.uid}`), async (snapshot) => {
            const roomID = snapshot.val();
            const chatroom = await dbGet(dbRef(db, `chatrooms/${roomID}`));
            const url = getDownloadURL(stRef(getStorage(firebaseApp), `chatrooms/${roomID}`))
            setJoinedChatroom((prev) => [...prev, {id: roomID, image: url, ...chatroom.val()}]);
        });
    }, [user, searchText]);

    useEffect(() => {
        const db = getDatabase(firebaseApp)
        if (!selectedChatroom) return;
        setMessages([]);
        onValue(dbRef(db, `chatrooms/${selectedChatroom.id}/messages`), (snapshot) => {
            setMessages(snapshot.val());
        });
    }, [selectedChatroom, selectedChatroom?.messages]);

    useEffect(() => {
        const db = getDatabase(firebaseApp)
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
    }, [selectedChatroom, selectedChatroom?.userData]);

    useEffect(() => {
        const db = getDatabase(firebaseApp)
        if (!searchText) {
            setSearchedChatroom([]);
            return;
        }
        onValue(dbRef(db, `chatrooms`), async (snapshot) => {
            const chatrooms: ChatroomData[] = [];
            snapshot.forEach((childSnapshot) => {
                console.log("test");
                const chatroom = childSnapshot.val() as ChatroomData;

                if (searchText[0] == "#" && chatroom.id == searchText.substring(1) || searchText[0] != "#" && chatroom.title.toLowerCase().includes(searchText.toLowerCase())) {
                    chatrooms.push(chatroom);
                }
            });
            setSearchedChatroom(chatrooms);
        });
    }, [searchText]);

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

    const handleEnterChatroom = async (chatroom: ChatroomData) => {
        setSelectedChatroom(chatroom);
        const ref = dbRef(getDatabase(firebaseApp), `user-joined-chatrooms/${user.uid}`);
        const chatrooms = await dbGet(ref);
        if (!(chatrooms.val() as string[]).includes(chatroom.id)) {
            await addUserToChatroom(user.uid, chatroom.id);
            console.log("Joined");
        }
    }

    const updateUserData = async () => {
        const db = getDatabase(firebaseApp)
        let avatar: string | null = null;
        if (avatarImage) {
            const ref = stRef(getStorage(firebaseApp), `users/${user.uid}`);
            await uploadBytes(ref, avatarImage);
            await updateMetadata(ref, {contentType: avatarImage.type});
            avatar = await getDownloadURL(ref);
        }
        await dbSet(dbRef(db, `users/${user.uid}`), {
            username: username,
            avatar: avatarImage === undefined ? userData.avatar : avatar
        });
        await queryClient.invalidateQueries(["user-auth", user]);
    }

    const addNewChatroom = async () => {
        const db = getDatabase(firebaseApp)
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
        const database = getDatabase(firebaseApp)
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
        setMessageText("");
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
                    <Command
                        className={`rounded-md border transition-width duration-200 ease-in-out ${sidebarOpen ? "w-[700px] sm:w-[420px]" : "w-20"}`}
                        onClick={() => setSidebarOpen(true)}>
                        <div
                            className={`flex ${sidebarOpen ? "flex-row" : "flex-col mt-2"} justify-between items-center w-full gap-1 pl-2`}>
                            <Input type="text" className={`w-full ${sidebarOpen ? "" : "mr-2"}`} placeholder="Join a chatroom..." value={searchText} onChange={(input) => setSearchText(input.target.value)}/>
                            <Button className={`flex gap-1 mx-2 my-2 ${sidebarOpen ? "" : "mr-4"}`}
                                    onClick={() => setOpenNewChatroom(true)}><Plus/>{sidebarOpen ?
                                <span>Room</span> : ""}</Button>
                        </div>
                        <div
                            className={`flex flex-col h-full ${sidebarOpen ? "overflow-y-scroll" : "overflow-y-hidden"} overflow-x-hidden py-2 gap-2`}>
                            {
                                (searchedChatroom.length == 0 && joinedChatroom.length == 0) ?
                                    <CommandEmpty>Join a chatroom and have fun!</CommandEmpty> :
                                    (searchText.length == 0 ? joinedChatroom : searchedChatroom).map((chatroom) => (
                                        <ChatroomBox key={chatroom.id} id={chatroom.id} img={chatroom.image}
                                                     title={chatroom.title} open={sidebarOpen}
                                                     description={chatroom.description}
                                                     onClick={() => handleEnterChatroom(chatroom)}/>))
                            }

                        </div>
                        <div className="h-20 flex flex-row justify-between items-center gap-2 px-3 rounded-md border">
                            <div className="flex flex-row gap-2 w-full overflow-x-clip">
                                <Avatar className="w-10">
                                    <AvatarImage src={userData.avatar}/>
                                    <AvatarFallback>{userData.username[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                {
                                    sidebarOpen ? <div className="flex flex-col w-full">
                                        <span className="font-semibold text-nowrap">{userData.username}</span>
                                        <span className="text-[13px] opacity-70 text-nowrap">{user.email}</span>
                                    </div> : <div></div>
                                }
                            </div>
                            {
                                sidebarOpen ? <DropdownMenu>
                                    <DropdownMenuTrigger>
                                        <Settings className="flex w-6 m-1"/>
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
                                </DropdownMenu> : <></>
                            }
                        </div>
                    </Command>
                    <div className="flex flex-col w-full h-full" onClick={() => setSidebarOpen(false)}>
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
                               setChatroomData({
                                   ...chatroomData,
                                   title: input.target.value,
                                   id: input.target.value.replace(" ", "-").toLowerCase()
                               });
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