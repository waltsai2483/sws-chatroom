import {Input} from "@/components/ui/input";
import {get as dbGet, getDatabase, onValue, ref as dbRef} from "@firebase/database";
import {firebaseApp} from "@/firebase/config";
import {UserData} from "@/app/lobby/page";
import {User} from "firebase/auth";
import {useState} from "react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import Marquee from "react-fast-marquee";
import {Button} from "@/components/ui/button";
import {UserPlus2} from "lucide-react";
import {addUserToChatroom} from "../../../lib/lobby";
import {UserIDData} from "@/app/lobby/LobbyChatroom";



const FriendSearcher = ({chatroomId}: {chatroomId: string}) => {
    const [searchedUsers, setSearchedUsers] = useState<UserIDData[]>([]);
    const friendSearch = async (text: string) => {
        const db = getDatabase(firebaseApp);
        onValue(dbRef(db, `users`), async (snapshot) => {
            const list: UserIDData[] = [];
            snapshot.forEach((child) => {
                const id = child.key;
                const userdata: UserData = child.val();
                if (text[0] == "@" && text.substring(1) == id || userdata.username.includes(text)) {
                    list.push({
                        id: id,
                        data: userdata
                    });
                }
            })
            setSearchedUsers(list);
        });
    }
    return <div>
        <Input type="text" className="w-full" placeholder="Search username or userid..."
               onChange={(input) => friendSearch(input.target.value)}/>
        <div className="w-full h-64 my-5 overflow-y-scroll border rounded-md shadow-sm">
            {
                searchedUsers.map((user) => <div key={"user-" + user.id}
                                                 className="h-16 flex flex-row justify-between items-center gap-2 ml-1 px-2 rounded-md select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                    <div className="flex flex-row items-center gap-3">
                        <Avatar className="w-12 h-12 border">
                            {user.data.avatar && <AvatarImage src={user.data.avatar}/>}
                            <AvatarFallback>{user.data.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-md font-semibold">{user.data.username}</span>
                            <span className="text-sm">{"@"+user.id}</span>
                        </div>
                    </div>
                    <Button variant="outline" className="h-10 w-10 p-0 items-center" onClick={() => addUserToChatroom(user.id, chatroomId)}>
                        <UserPlus2 className="h-4 w-4"/>
                    </Button>
                </div>)
            }
        </div>
    </div>
}

export default FriendSearcher;