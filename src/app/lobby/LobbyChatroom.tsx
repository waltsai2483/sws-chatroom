import {LogOut, MessageCircleMore, Send, SendHorizonal, Settings, User2} from "lucide-react";
import ThemeButton from "@/components/theme/theme-button";
import {Separator} from "@/components/ui/separator";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator
} from "@/components/ui/command";
import {EmailAuthProvider, reauthenticateWithCredential, updatePassword, User} from "firebase/auth";
import {UserData} from "@/app/lobby/page";
import {useState} from "react";
import {useQuery} from "react-query";
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
import {PasswordInput} from "@/components/form/PasswordInput";
import {getDownloadURL, getStorage, ref as stRef, updateMetadata, uploadBytes} from "@firebase/storage";
import {getDatabase, ref as dbRef, set as dbSet} from "@firebase/database";
import {Textarea} from "@/components/ui/textarea";

const ChatroomBox = ({id, img, title, description}: { id: string, img: string, title: string, description: string }) => {
    return <div className="h-16 flex flex-row items-center gap-2 ml-1 px-2 rounded-md select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
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

const LobbyChatroom = ({user, userData}: { user: User, userData: UserData }) => {
    const [isSettingsOpen, setOpenSettings] = useState(false);
    const [avatarImage, setAvatarImage] = useState<File | null | undefined>(null);
    const [username, setUsername] = useState<string>(userData.username);
    const [password, setPassword] = useState({old: "", new: "", authFailed: false});
    const [selectedChatroom, setSelectedChatroom] = useState<string | null>(null);
    const [messageText, setMessageText] = useState("");
    const router = useRouter();

    const logout = () => {
        getAuth(firebaseApp).signOut().then(() => {
                router.replace("/login");
            }
        )
    }
    const initDialog = (open: boolean) => {
        setOpenSettings(open);
        setAvatarImage(undefined);
    }
    const updateUserData = async () => {
        let avatar: string | null = null;
        if (avatarImage) {
            const ref = stRef(getStorage(firebaseApp), `users/${user.uid}`);
            await uploadBytes(ref, avatarImage);
            await updateMetadata(ref, {contentType: avatarImage.type});
            avatar = await getDownloadURL(ref);
        }
        await dbSet(dbRef(getDatabase(firebaseApp), `users/${user.uid}`), {username: username, avatar: avatarImage === undefined ? userData.avatar : avatar});
    }

    return <main className="flex flex-col h-screen justify-center">
        <Dialog open={isSettingsOpen} onOpenChange={(open) => initDialog(open)}>
            <div
                className="flex flex-row justify-between items-center text-2xl text-black dark:text-gray-300 font-semibold mx-3 my-4">
                <div className="flex flex-row gap-2 items-center">
                    <MessageCircleMore className="h-7 w-9 mb-0.5"/>
                    Chatroom
                </div>
                <ThemeButton/>
            </div>
            <Separator/>
            <div className="flex flex-row h-full justify-between !text-white">
                <Command className="rounded-md border shadow-md resize-x max-w-[40%] min-w-80">
                    <CommandInput placeholder="Find or Join a chatroom..."/>
                    <div className="flex flex-col h-full overflow-y-scroll overflow-x-hidden py-2 gap-2">
                        <CommandGroup heading="Public">
                            <ChatroomBox id="global-chatroom" img="Glb" title="Global"
                                         description="A open space for everyone"/>
                        </CommandGroup>
                        <CommandGroup heading="Private">
                        </CommandGroup>
                    </div>
                    <div className="h-20 flex flex-row items-center gap-2 px-3 rounded-md border shadow-md">
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
                    <div className="h-14 flex flex-row items-center gap-2 border-b rounded-b-md shadow-sm">
                    </div>
                    <div className="h-full overflow-y-scroll"></div>
                    <div className="flex flex-row w-full p-2 gap-4 items-center">
                        <Textarea className="min-h-24 max-h-24" value={messageText} onChange={(input) => setMessageText(input.target.value)}></Textarea>
                        <Button className="w-16 h-[95%]">
                            <SendHorizonal />
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
    </main>
}

export default LobbyChatroom;