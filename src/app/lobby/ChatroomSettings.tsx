import {ChatroomData} from "@/app/lobby/LobbyChatroom";
import AccountAvatar from "@/components/form/AccountAvatar";
import {Input} from "@/components/ui/input";
import {useEffect, useState} from "react";
import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {DialogBody} from "next/dist/client/components/react-dev-overlay/internal/components/Dialog";
import {Button} from "@/components/ui/button";
import {
    getDatabase,
    ref as dbRef,
    get as dbGet,
    set as dbSet,
    remove as dbRemove
} from "@firebase/database";
import {firebaseApp} from "@/firebase/config";
import {
    getDownloadURL,
    getStorage,
    ref as stRef,
    deleteObject as stRemove,
    updateMetadata,
    uploadBytes
} from "@firebase/storage";
import {Checkbox} from "@/components/ui/checkbox";
import {User} from "firebase/auth";

export const ChatroomSettings = ({chatroom, setLoading}: { chatroom: ChatroomData, setLoading: (arg: string) => void }) => {
    const [chatroomImage, setChatroomImage] = useState<File | null | undefined>();
    const [chatroomTitle, setChatroomTitle] = useState("");
    const [chatroomDescription, setChatroomDescription] = useState("");
    const [deleteChatroomChecked, setDeleteChatroomChecked] = useState(false);

    useEffect(() => {
        setChatroomTitle(chatroom.title);
        setChatroomDescription(chatroom.description);
    }, [chatroom]);

    const updateChatroomData = async () => {
        let image: string | null = chatroom.image;
        setLoading("Updating chatroom...");
        if (chatroomImage) {
            const ref = stRef(getStorage(firebaseApp), `chatrooms/${chatroom.id}/icon`);
            await uploadBytes(ref, chatroomImage);
            await updateMetadata(ref, {contentType: chatroomImage.type});
            image = await getDownloadURL(ref);
        }
        await dbSet(dbRef(getDatabase(firebaseApp), `chatrooms/${chatroom.id}`), {
            ...chatroom,
            title: chatroomTitle,
            description: chatroomDescription,
            image: image
        } as ChatroomData);
        setLoading("");
    }

    const deleteChatroom = async () => {
        const db = getDatabase(firebaseApp);
        setLoading("Deleting chatroom...");
        const joinedUsers = await dbGet(dbRef(db, "user-joined-chatrooms"));
        joinedUsers.forEach((child) => {
            child.forEach((joinedId) => {
                if (joinedId.val() == chatroom.id) {
                    dbRemove(dbRef(db, `user-joined-chatrooms/${child.key}/${joinedId.key}`));
                }
            });
        });
        try {
            await stRemove(stRef(getStorage(firebaseApp), `chatrooms/${chatroom.id}`));
        } catch (err) {
        }
        await dbRemove(dbRef(db, `chatrooms/${chatroom.id}`));
        setLoading("");
    }

    return <DialogContent>
        <DialogHeader>
            <DialogTitle>Chatroom Settings</DialogTitle>
            <DialogDescription>Redesign your chatroom here!</DialogDescription>
        </DialogHeader>
        <DialogBody className="px-1 flex flex-col items-center gap-3">
            <AccountAvatar username={chatroom.title} defAvatarUrl={chatroom.image}
                           avatarImage={chatroomImage} setAvatarImage={setChatroomImage}/>
            <Input type="text" placeholder="Title" value={chatroomTitle}
                   onChange={(input) => setChatroomTitle(input.target.value)}/>
            <Input type="text" placeholder="Description" value={chatroomDescription}
                   onChange={(input) => setChatroomDescription(input.target.value)}/>
        </DialogBody>
        <div className="flex flex-row gap-2 mx-1 items-start">
            <Checkbox id="delete-chatroom" onCheckedChange={(checked) => setDeleteChatroomChecked(checked == true)}/>
            <label htmlFor="delete-chatroom"
                   className="text-sm font-medium leading-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I would like to delete this chatroom permanently.
            </label>
        </div>
        <DialogClose asChild>
            <Button disabled={!deleteChatroomChecked} variant="destructive" className="w-full" onClick={deleteChatroom}>Delete Chatroom</Button>
        </DialogClose>
        <DialogClose asChild>
            <Button className="w-full" onClick={() => updateChatroomData()}>Confirm</Button>
        </DialogClose>
    </DialogContent>
}