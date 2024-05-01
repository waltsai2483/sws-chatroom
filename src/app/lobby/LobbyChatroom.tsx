import {
    Image,
    LogOut,
    MessageCircleMore,
    Plus,
    SendHorizonal,
    Settings,
    Text,
    User2,
    UserPlus2,
    Video
} from "lucide-react";
import ThemeButton from "@/components/theme/theme-button";
import {
    Command, CommandEmpty
} from "@/components/ui/command";
import {User} from "firebase/auth";
import {UserData} from "@/app/lobby/page";
import {FC, useCallback, useEffect, useRef, useState} from "react";
import {useQueryClient} from "react-query";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {useRouter} from "next/navigation";
import {getAuth} from "@firebase/auth";
import {firebaseApp} from "@/firebase/config";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {DialogBody} from "next/dist/client/components/react-dev-overlay/internal/components/Dialog";
import AccountAvatar from "@/components/form/AccountAvatar";
import {Input} from "@/components/ui/input";
import {getDownloadURL, getStorage, ref as stRef, updateMetadata, uploadBytes} from "@firebase/storage";
import {
    getDatabase,
    onChildAdded,
    ref as dbRef,
    set as dbSet,
    get as dbGet,
    remove as dbRemove,
    onValue,
    onChildChanged, onChildRemoved, DataSnapshot
} from "@firebase/database";
import Marquee from "react-fast-marquee";
import {addUserToChatroom} from "../../../lib/lobby";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {visit} from "yaml";
import {cn, randomID, sendNotification} from "@/lib/utils";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import NextImage from "next/image";
import FriendSearcher from "@/app/lobby/FriendSearch";
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu";
import {ChatroomSettings} from "@/app/lobby/ChatroomSettings";

export enum MessageType {
    TEXT,
    IMAGE,
    VIDEO
}

export enum ChatroomVisibility {
    PUBLIC = "public",
    PRIVATE = "private"
}

export const EMPTY_CHATROOM = {
    visibility: ChatroomVisibility.PUBLIC,
    id: "",
    title: "",
    owner: "",
    description: "",
    image: "",
    messages: [],
    userData: []
}

export type ChatroomData = {
    id: string,
    visibility: ChatroomVisibility,
    owner: string,
    title: string,
    description: string,
    image: string,
    messages: Message[],
    userData: string[]
}

export type Message = {
    type: MessageType,
    data: string,
    key: string,
    id: string,
    username?: string,
    userimg?: string,
    date: string,
    filetype?: string
}

export type UserIDData = {
    id: string
    data: UserData
}

const FileUplaod: FC<{
    icon: JSX.Element,
    text: string,
    extension: string,
    onFileChanged: (file?: File) => void
}> = ({icon, text, extension, onFileChanged}) => {
    const hiddenInput = useRef<HTMLInputElement>(null);
    const buttonClick = () => {
        hiddenInput.current!.click();
    }

    return <div><Button variant="ghost" className="w-full h-8 flex flex-row justify-between items-center"
                        onClick={buttonClick}>
        {icon}
        {text}
    </Button>
        <input ref={hiddenInput} type="file" className="hidden" accept={extension}
               onChange={(input) => onFileChanged(input.target.files?.item(0) ?? undefined)}/>
    </div>
        ;
}

const ChatroomBox = ({className, img, title, description, onClick, open}: {
    className: string,
    img: string,
    title: string,
    description: string,
    onClick: () => void,
    open: boolean
}) => {
    return <div
        className={`h-16 flex flex-row items-center gap-2 ml-1 px-2 rounded-md select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 ${className}`}
        onClick={onClick}>
        <Avatar className="w-12 h-12 border">
            {img && <AvatarImage src={img}/>}
            <AvatarFallback>{title[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        {
            open ? <div className="flex flex-col">
                <span className="text-md font-semibold">{title}</span>
                <Marquee className="text-sm" speed={description.length ?? 0}>{description}
                    <div className="w-6"/>
                </Marquee>
            </div> : ""
        }
    </div>
}

const MessageBox = ({user, message, selectedChatroom}: {
    user: string,
    message: Message,
    selectedChatroom: string
}) => {
    const unsendMessage = async () => {
        await dbRemove(dbRef(getDatabase(firebaseApp), `chatrooms/${selectedChatroom}/messages/${message.key}`));
    }

    return <ContextMenu>
        <ContextMenuTrigger>
            <div className="text-sm hover:bg-gray-50 hover:dark:bg-gray-900">
                {
                    (message.type == MessageType.TEXT) ? message.data : message.type == MessageType.IMAGE ?
                        <NextImage src={message.data} width={200} height={300}
                                   className="w-1/5 h-auto" alt={message.data}/> :
                        <video width="400" height="225" preload="none" controls>
                            <source src={message.data} type={message.filetype}/>
                            {message.data}
                        </video>
                }</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
            <ContextMenuItem inset onClick={() => navigator.clipboard.writeText(message.data)}>
                Copy
            </ContextMenuItem>
            {
                message.id == user && <ContextMenuItem inset onClick={unsendMessage}>
                    Unsend
                </ContextMenuItem>
            }
        </ContextMenuContent>
    </ContextMenu>
}

const UserBox = ({user, onClick}: { user: UserIDData, onClick: () => void }) => {
    return <div key={"user-" + user.id}
                className="h-16 flex flex-row items-center gap-2 ml-1 px-2 rounded-md select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                onClick={() => onClick()}>
        <Avatar className="w-12 h-12 border">
            {user.data.avatar && <AvatarImage src={user.data.avatar}/>}
            <AvatarFallback>{user.data.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
            <span className="text-md font-semibold">{user.data.username}</span>
            <span className="text-sm">{"@" + user.id}</span>
        </div>
    </div>
}

const LobbyChatroom = ({user, userData, setLoading}: {
    user: User,
    userData: UserData,
    setLoading: (arg: string) => void
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
    const [searchedUsers, setSearchedUsers] = useState<UserIDData[]>([]);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();
    const queryClient = useQueryClient();

    const db = getDatabase(firebaseApp);

    const requestNotificationPermission = useCallback(() => {
        if ("Notification" in window) {
            Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                    onValue(dbRef(db, `user-joined-chatrooms/${user.uid}`), (snapshot) => {
                        snapshot.forEach((child) => {
                            const chatroomid = child.val();
                            dbGet(dbRef(db, `chatrooms/${chatroomid}`))
                                .then((value) => {
                                    const chatroom = value.val() as ChatroomData;
                                    let guardInitRecall = true;
                                    onChildAdded(dbRef(db, `chatrooms/${chatroomid}/messages`), (snapshot) => {
                                        const message = snapshot.val() as Message;
                                        if (!guardInitRecall && message.id != user.uid) {
                                            sendNotification(message, chatroom);
                                        }
                                    });

                                    onValue(dbRef(db, `chatrooms/${chatroomid}/messages`), (snapshot) => {
                                        guardInitRecall = false;
                                    });
                                });

                        });
                    });
                }
            });
        }
    }, [db, user.uid]);

    const updateSelectedChatroom = useCallback((snapshot: DataSnapshot) => {
        if (snapshot.key == selectedChatroom?.id) {
            setSelectedChatroom(snapshot.val());
        }
    }, [selectedChatroom]);

    useEffect(() => {
        if ("Notification" in window) {
            requestNotificationPermission();
        }
    }, [requestNotificationPermission]);

    useEffect(() => {
        onChildAdded(dbRef(db, `user-joined-chatrooms/${user.uid}`), async (snapshot) => {
            const roomID = snapshot.val();
            const chatroom = await dbGet(dbRef(db, `chatrooms/${roomID}`));
            const data = chatroom.val() as ChatroomData;
            setJoinedChatroom((prev) => [...prev, data]);
            console.log("added");
        });
    }, []);

    useEffect(() => {
        onChildRemoved(dbRef(db, `user-joined-chatrooms/${user.uid}`), (snapshot) => {
            const roomID = snapshot.val();
            setJoinedChatroom((prev) => prev.filter((value) => value.id != snapshot.val()));
            setMessages([]);
            setSelectedChatroom(null);
            console.log("removed");
        });
    }, []);

    useEffect(() => {
        onChildChanged(dbRef(db, `chatrooms`), async (snapshot) => {
            let isJoined = false;
            (await dbGet(dbRef(db, `user-joined-chatrooms/${user.uid}`))).forEach((child) => isJoined = isJoined || child.val() == snapshot.key);
            if (!isJoined) return;
            setJoinedChatroom((prev) => [...prev.filter((value) => value.id != snapshot.key), snapshot.val()]);
            updateSelectedChatroom(snapshot);
            console.log("changed");
        }, {onlyOnce: true});
    }, [updateSelectedChatroom]);

    useEffect(() => {
        const db = getDatabase(firebaseApp)
        onValue(dbRef(db, `chatrooms`), async (snapshot) => {
            let chatrooms: ChatroomData[] = [];
            if (searchText[0] == "@") {
                await friendSearch();
                setSearchedChatroom([]);
            } else {
                snapshot.forEach((childSnapshot) => {
                    const chatroom = childSnapshot.val() as ChatroomData;
                    if (chatroom.visibility == ChatroomVisibility.PUBLIC) {
                        if (searchText[0] == "#" && chatroom.id == searchText.substring(1) || searchText[0] != "#" && chatroom.title.toLowerCase().includes(searchText.toLowerCase())) {
                            chatrooms.push(chatroom);
                        }
                    } else {
                        if (searchText[0] == "#" && chatroom.id == searchText.substring(1)) {
                            chatrooms.push(chatroom);
                        }
                    }
                });
                setSearchedUsers([]);
                setSearchedChatroom(chatrooms);
            }
        });
    }, [user, searchText]);

    useEffect(() => {
        const db = getDatabase(firebaseApp)
        if (!selectedChatroom) return;
        setMessages([]);
        onValue(dbRef(db, `chatrooms/${selectedChatroom.id}/messages`), (snapshot) => {
            const list: Message[] = [];
            snapshot.forEach((snapshot) => {
                list.push({...snapshot.val(), key: snapshot.key} as Message);
            })
            setMessages(list);
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

    const generateID = (id: string, visibility = chatroomData.visibility) => visibility == ChatroomVisibility.PRIVATE ? randomID(18) : id.replace(" ", "-").toLowerCase().concat(`:${randomID(6)}`);

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

    const handleSearch = async (searchText: string) => {
        setSearchText(searchText);
    }

    const friendSearch = async () => {
        const db = getDatabase(firebaseApp);
        onValue(dbRef(db, `users`), async (snapshot) => {
            const list: UserIDData[] = [];
            snapshot.forEach((child) => {
                const id = child.key;
                if (id == user.uid) return;
                const userdata: UserData = child.val();
                if (searchText.substring(1) == id || userdata.username.includes(searchText.substring(1))) {
                    list.push({
                        id: id,
                        data: userdata
                    });
                }
            })
            setSearchedUsers(list);
        });
    }

    const openPrivateChatroomWith = async (id: string, friend: UserData) => {
        if (user.uid == id) return;
        const newRoom = {
            id: generateID("", ChatroomVisibility.PRIVATE),
            title: `Chatroom with ${friend.username} and ${userData.username}`,
            owner: user.uid,
            description: "",
            visibility: ChatroomVisibility.PRIVATE,
            image: friend.avatar,
            messages: [],
            userData: []
        };
        setSearchText("");
        setLoading("Creating private room...");
        await addNewChatroom(newRoom);
        await addUserToChatroom(user.uid, newRoom.id);
        await addUserToChatroom(id, newRoom.id);
        await handleEnterChatroom(newRoom);
        setLoading("");
    }

    const handleEnterChatroom = async (chatroom: ChatroomData) => {
        setLoading("Enter chatroom...");
        setSelectedChatroom(chatroom);
        const ref = dbRef(getDatabase(firebaseApp), `user-joined-chatrooms/${user.uid}`);
        const snapshot = await dbGet(ref);
        const chatrooms = snapshot.val() as string[];
        if (!chatrooms || !chatrooms.includes(chatroom.id)) {
            await addUserToChatroom(user.uid, chatroom.id);
        }
        setLoading("");
    }

    const updateUserData = async () => {
        const db = getDatabase(firebaseApp)
        let avatar: string | null = userData.avatar;
        setLoading("Updating user data...");
        if (avatarImage) {
            const ref = stRef(getStorage(firebaseApp), `users/${user.uid}`);
            await uploadBytes(ref, avatarImage);
            await updateMetadata(ref, {contentType: avatarImage.type});
            avatar = await getDownloadURL(ref);
        }
        await dbSet(dbRef(db, `users/${user.uid}`), {
            username: username,
            avatar: avatar
        });
        await queryClient.invalidateQueries(["user-auth", user]);
        setLoading("");
    }

    const addNewChatroom = async (chatroomData: ChatroomData) => {
        const db = getDatabase(firebaseApp)
        let avatar: string | null = chatroomData.image;
        if (chatroomImage) {
            const ref = stRef(getStorage(firebaseApp), `chatrooms/${chatroomData.id}/icon`);
            await uploadBytes(ref, chatroomImage);
            await updateMetadata(ref, {contentType: chatroomImage.type});
            avatar = await getDownloadURL(ref);
        }
        await dbSet(dbRef(db, `chatrooms/${chatroomData.id}`), {...chatroomData, image: avatar});
        await addUserToChatroom(user.uid, chatroomData.id);
    }

    const addNewMessage = async () => {
        if (!selectedChatroom) return;
        setSendingMessage(true);
        const database = getDatabase(firebaseApp)
        const currentState = (await dbGet(dbRef(database, `chatrooms/${selectedChatroom.id}`))).val() as ChatroomData;
        const messageIdx = parseInt((await dbGet(dbRef(database, `chatrooms/${currentState.id}/messageCounter`))).val() ?? "0");
        await dbSet(dbRef(database, `chatrooms/${currentState.id}/messages/${messageIdx}`), {
            type: MessageType.TEXT,
            id: user.uid,
            username: userData.username,
            date: new Date().toISOString(),
            data: messageText,
        });
        await dbSet(dbRef(database, `chatrooms/${currentState.id}/messageCounter`), messageIdx + 1);
        setSelectedChatroom(currentState);
        setMessageText("");
        setSendingMessage(false);
    }

    const addFileMessage = async (type: number, file: File | undefined) => {
        if (!selectedChatroom) return;
        if (!file) return;
        setSendingMessage(true);
        const database = getDatabase(firebaseApp)
        const currentState = (await dbGet(dbRef(database, `chatrooms/${selectedChatroom.id}`))).val() as ChatroomData;
        const messageIdx = (await dbGet(dbRef(database, `chatrooms/${currentState.id}/messages`))).size;
        const ref = stRef(getStorage(firebaseApp), `chatrooms/${selectedChatroom.id}/messages/${messageIdx}`);
        await uploadBytes(ref, file);
        await updateMetadata(ref, {contentType: file.type});
        const url = await getDownloadURL(ref);
        await dbSet(dbRef(database, `chatrooms/${currentState.id}/messages/${messageIdx}`), {
            type: type,
            id: user.uid,
            username: userData.username,
            date: new Date().toISOString(),
            data: url,
            filetype: file.type
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
                    <Command
                        className={`rounded-md border transition-width duration-200 ease-in-out ${sidebarOpen ? "w-[700px] sm:w-[420px]" : "w-20"}`}
                        onClick={() => setSidebarOpen(true)}>
                        <div
                            className={`flex ${sidebarOpen ? "flex-row" : "flex-col mt-2"} justify-between items-center w-full gap-1 pl-2`}>
                            <Input type="text" className={`w-full ${sidebarOpen ? "" : "mr-2"}`}
                                   placeholder="Join a chatroom..." value={searchText}
                                   onChange={(input) => handleSearch(input.target.value)}/>
                            <Button className={`flex gap-1 mx-2 my-2 ${sidebarOpen ? "" : "mr-4"}`}
                                    onClick={() => setOpenNewChatroom(true)}><Plus/>{sidebarOpen ?
                                <span>Room</span> : ""}</Button>
                        </div>
                        <div
                            className={`flex flex-col h-full ${sidebarOpen ? "overflow-y-scroll" : "overflow-y-hidden"} overflow-x-hidden py-2 gap-2`}>
                            {
                                (searchedChatroom.length == 0 && searchedUsers.length == 0 && joinedChatroom.length == 0) ?
                                    <CommandEmpty>Join a chatroom and have fun!</CommandEmpty> :
                                    searchText[0] == "@" ? searchedUsers.map((user) => <UserBox key={user.id}
                                                                                                user={user}
                                                                                                onClick={() => openPrivateChatroomWith(user.id, user.data)}/>) :
                                        (searchText.length == 0 ? joinedChatroom : searchedChatroom).map((chatroom, index) => (
                                            <ChatroomBox key={`${chatroom.id}-${index}`}
                                                         className={chatroom.id == selectedChatroom?.id ? "bg-gray-50 dark:bg-gray-900" : ""}
                                                         img={chatroom.image}
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
                        <div
                            className="h-16 flex flex-row justify-between items-center px-3 gap-2 border-b rounded-b-md shadow-sm">
                            <div className="flex flex-row items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{selectedChatroom?.title[0].toUpperCase()}</AvatarFallback>
                                    <AvatarImage src={selectedChatroom?.image}/>
                                </Avatar>
                                <div className="text-md font-semibold">{selectedChatroom?.title}</div>
                            </div>
                            {
                                selectedChatroom && <div className="flex flex-row items-center gap-2">
                                    <Dialog>
                                        <DialogTrigger name=""
                                                       className="w-10 h-10 px-0 flex flex-row justify-center items-center border rounded-md hover:bg-gray-50 hover:dark:bg-gray-900">
                                            <UserPlus2 className="h-4 w-4"/></DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Add Friends</DialogTitle>
                                                <DialogDescription>Add your friends to chat together!</DialogDescription>
                                            </DialogHeader>
                                            <DialogBody className="px-3">
                                                <FriendSearcher id={selectedChatroom?.id!}/>
                                            </DialogBody>
                                            <DialogClose asChild>
                                                <Button className="w-full">Close</Button>
                                            </DialogClose>
                                        </DialogContent>
                                    </Dialog>
                                    {
                                        <Dialog>
                                            <DialogTrigger disabled={selectedChatroom.owner != user.uid}
                                                           className={`w-10 h-10 px-0 flex flex-row justify-center items-center border rounded-md hover:bg-gray-50 hover:dark:bg-gray-900 ${selectedChatroom.owner != user.uid ? "opacity-50" : ""}`}>
                                                <Settings className="h-4 w-4"/>
                                            </DialogTrigger>
                                            <ChatroomSettings chatroom={selectedChatroom}
                                                              setLoading={setLoading}/>
                                        </Dialog>
                                    }
                                </div>
                            }
                        </div>

                        <div className="h-full flex overflow-y-scroll flex-col-reverse p-4">
                            {
                                messages && messages.toReversed().map((message, index) => {
                                    if (messages.toReversed()[index + 1]?.id == message.id) {
                                        return <div key={`${selectedChatroom?.id}-${index}`}
                                                    className={`ml-[52px] ${messages.toReversed()[index + 2]?.id == message.id ? "pt-1" : ""}`}>
                                            <MessageBox user={user.uid} message={message}
                                                        selectedChatroom={selectedChatroom!.id}/>
                                        </div>;
                                    }
                                    return <div key={`${selectedChatroom?.id}-${index}`}>
                                        <div className={`flex flex-row items-center gap-3`}>
                                            <Avatar className="h-9 w-9 mx-0.5">
                                                <AvatarFallback>{userDataList?.get(message.id)?.username[0].toUpperCase()}</AvatarFallback>
                                                <AvatarImage src={userDataList?.get(message.id)?.avatar}/>
                                            </Avatar>
                                            <span
                                                className="text-md font-semibold text-gray-700 dark:text-gray-300">{userDataList?.get(message.id)?.username}</span>
                                        </div>
                                        <div className="ml-[52px] pb-1"><MessageBox user={user.uid} message={message}
                                                                                    selectedChatroom={selectedChatroom!.id}/>
                                        </div>
                                    </div>
                                })
                            }
                        </div>
                        <div className="flex flex-row w-full h-20 px-2 gap-2 items-center">
                            <Popover>
                                <PopoverTrigger
                                    className="w-[76px] h-14 px-0 flex flex-row justify-center items-center border rounded-md hover:bg-gray-50 hover:dark:bg-gray-900"><Plus
                                    className="w-8"/></PopoverTrigger>
                                <PopoverContent className="w-28 flex-col gap-1 p-1 py-2" side="top" sideOffset={8}>
                                    <FileUplaod extension="image/*" icon={<Image className="!w-4 !h-4"/>} text="Image"
                                                onFileChanged={(file) => addFileMessage(MessageType.IMAGE, file)}/>
                                    <FileUplaod extension="video/*" icon={<Video className="!w-4 !h-4"/>} text="Video"
                                                onFileChanged={(file) => addFileMessage(MessageType.VIDEO, file)}/>
                                </PopoverContent>
                            </Popover>
                            <Input type="text" placeholder="Input message..."
                                   className="h-14 overflow-y-hidden whitespace-pre-wrap" value={messageText}
                                   onChange={(input) => setMessageText(input.target.value)}></Input>
                            <Button className="w-20 h-14" onClick={async () => await addNewMessage()}
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
                    <div className="flex flex-row w-full items-center gap-2"><Input disabled={true} type="text"
                                                                                    placeholder="ID"
                                                                                    value={`#${chatroomData?.id}`}/><Button
                        className="w-32" onClick={() => {
                        chatroomData?.id && navigator.clipboard.writeText(`#${chatroomData?.id}`)
                    }}>Copy</Button></div>
                    <Input type="text" placeholder="Title" value={chatroomData?.title}
                           onChange={(input) => {
                               setChatroomData({
                                   ...chatroomData,
                                   title: input.target.value,
                                   id: generateID(input.target.value)
                               });
                           }}/>
                    <Input type="text" placeholder="Description" value={chatroomData?.description}
                           onChange={(input) => setChatroomData({...chatroomData, description: input.target.value})}/>
                    <Tabs className="w-full p-3 px-1" value={chatroomData.visibility}
                          onValueChange={(value) => setChatroomData({
                              ...chatroomData,
                              id: generateID(chatroomData.title, value as ChatroomVisibility),
                              visibility: value as ChatroomVisibility
                          })}>
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value={ChatroomVisibility.PUBLIC}>Public</TabsTrigger>
                            <TabsTrigger value={ChatroomVisibility.PRIVATE}>Private</TabsTrigger>
                        </TabsList>
                        <TabsContent value={ChatroomVisibility.PUBLIC} className="text-sm px-2">Anyone can join your
                            chatroom by <strong>searching
                                the name of chatroom.</strong> You can choose to block them though.</TabsContent>
                        <TabsContent value={ChatroomVisibility.PRIVATE} className="text-sm px-2">Your ID will be
                            randomly given, only users who knows your ID can join your chatroom.</TabsContent>
                    </Tabs>
                </DialogBody>
                <DialogClose asChild>
                    <Button className="w-full" disabled={!chatroomData.title}
                            onClick={() => addNewChatroom({...chatroomData, owner: user.uid})}>Add
                        Chatroom</Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    </main>
}

export default LobbyChatroom;