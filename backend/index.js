import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./utils/db.js";
import dotenv from "dotenv";
import userRoute from "./routes/user.route.js"
import postRoute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";

dotenv.config({});

const app= express();
const PORT= process.env.PORT || 3000;

app.get("/",(req,resp)=>{
    return resp.status(200).json({
        message: "I'm coming from backend.",
        success: true
    })
});

//middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:true}));
const corsOptions={
    origin: 'http://localhost:5173',    //this webadress is of vite.
    credentials: true
};
app.use(cors(corsOptions));

//yaha pr apni API aayenge
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/message", messageRoute);
// "http://localhost:8000/api/v1/user/register" not to use

app.listen(PORT,()=>{
    connectDB();
    console.log(`Server listen at port ${PORT} `);
});