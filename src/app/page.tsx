import {redirect} from "next/navigation";
import {getAuth} from "@firebase/auth";
import {firebaseApp} from "@/firebase/config";

const Home = () => {
    redirect("/login");
    return <></>
}

export default Home;