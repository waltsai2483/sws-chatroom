import {redirect} from "next/navigation";
import {getAuth} from "@firebase/auth";
import {firebaseApp} from "@/firebase/config";

const Home = () => {
    const user = getAuth(firebaseApp).currentUser;
    if (user) {
        redirect("/lobby");
    } else {
        redirect("/login");
    }
    return <></>
}

export default Home;