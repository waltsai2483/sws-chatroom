import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {useLayoutEffect, useRef, useState} from "react";
import {Plus} from "lucide-react";

const AccountAvatar = ({username, avatarImage, setAvatarImage, ...props}: { username: string, avatarImage: File | null, setAvatarImage: (arg: File | null) => void }) => {
    const [avatarHover, setAvatarHover] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState("");
    const avatarInput = useRef<HTMLInputElement>(null);

    useLayoutEffect(() => {
        setAvatarUrl(avatarImage ? URL.createObjectURL(avatarImage) : "");
    }, [avatarImage]);
    const onAvatarClick = () => {
        avatarInput.current!.click();
    }
    const onAvatarChange = () => {
        setAvatarImage(avatarInput.current!.files?.item(0) ?? null);
    }

    return <Avatar className="w-12 h-12" onMouseEnter={() => setAvatarHover(true)}
                   onMouseLeave={() => setAvatarHover(false)} onClick={onAvatarClick} {...props}>
        <AvatarImage src={avatarUrl}></AvatarImage>
        <AvatarFallback>{username.toUpperCase()[0]}</AvatarFallback>
        <div className="w-12 h-12 rounded-xl bg-black absolute z-10 transition-opacity ease-in-out duration-500 bg-opacity-0 hover:bg-opacity-50 cursor-pointer">
            {avatarHover && <Plus className="w-6 h-6 top-3 left-3 absolute text-opacity-25" />}
        </div>
        <input ref={avatarInput} type="file" className="hidden" accept="image/*" onChange={onAvatarChange}/>
    </Avatar>;
};

export default AccountAvatar;