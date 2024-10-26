import jwt from "jsonwebtoken";

const isAuthenticated = async (req,resp,next)=>{
    try{
        const token = req.cookies.token;
        if(!token){
            return resp.status(401).json({
                message:'User not authenticated',
                success: false
            });
        }
        const decode= await jwt.verify(token, process.env.SECRET_KEY);
        if( !decode){
            return resp.status(401).json({
                message: 'Invalid',
                success: false
            });
        }
        req.id= decode.userId;
        next();
    }catch(error){
        console.log(error);
    }
}
export default isAuthenticated;