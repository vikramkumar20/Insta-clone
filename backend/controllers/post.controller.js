import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import {Post} from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";

export const addNewPost= async(req,resp)=>{
    try{
        const {caption}= req.body;
        const image= req.file;
        const authorId= req.id;

        if(!image){
            return resp.status(400).json({
                message: 'Image required'
            })
        }
        // image upload
        const optimizedImageBuffer= await sharp(image.buffer).resize({width:800, height:800, fit:'inside'}).toFormat('jpeg',{quality:80}).toBuffer();
        
        //buffer to data uri
        const fileUri= `data:image/jpeg:base64,${optimizedImageBuffer.toString('base64')}`;
        const cloudResponse = await cloudinary.uploader.upload(fileUri);
        const post= await Post.create({
            caption,
            image: cloudResponse.secure_url,
            author: authorId
        });
        const user= await User.findById(authorId);
        if(user){
            user.posts.push(post._id);
            await user.save();
        }

        await post.populate({path:'author',select:'-password'});

        return resp.status(201).json({
            message: 'New post added',
            post,
            success: true,
        })
    }
    catch(error){
        console.log(error);
    }
}

export const getAllPost = async (req,resp)=>{
    try{
        const posts = await Post.find().sort({createdAt:-1}).populate({path:'author',select:'username,profilePicture'}).populate({
            path: 'comments',
            sort: {createdAt:-1},
            populate:{
                path:'author',
                select: 'username, profilePicture'
            }
        });
        return resp.status(200).json({
            posts,
            success: true,
        })
    }
    catch(error){
        console.log(error);
    }
};

export const getUserPost= async(req,resp)=>{
    try{
        const authorId= req.id;
        const posts= await Post.find({author: authorId}).sort({createdAt: -1}).populate({
            path: 'author',
            select: 'username, profilePicture',
            populate:{
                path:'author',
                select: 'username, profilePicture'
            }
        });
        return resp.status(200).json({
            posts,
            success: true,
        })
    }catch(error){
        console.log(error);
    }
}
export const likePost= async (req,resp)=>{
    try{
        const likeKrneWalaUserKiId= req.id;
        const postId= req.param.id;
        const post= await Post.findById(postId);
        if(!post) return resp.status(404).json({
            message: 'Post not found',
            success: false
        });

        //logic of likes on a post
        await post.updateOne({$addToSet:{likes:likeKrneWalaUserKiId}});
        await post.save();

        //implement socket.io for real time n notification
        return resp.status(200).json({
            message: 'Post liked',
            success: true,
        })
    }catch( error){
        console.log(error);
    }
}

export const dislikePost= async (req,resp)=>{
    try{
        const likeKrneWalaUserKiId= req.id;
        const postId= req.param.id;
        const post= await Post.findById(postId);
        if(!post) return resp.status(404).json({
            message: 'Post not found',
            success: false
        });

        //logic of likes on a post
        await post.updateOne({$pull:{likes:likeKrneWalaUserKiId}});
        await post.save();

        //implement socket.io for real time n notification
        return resp.status(200).json({
            message: 'Post disliked',
            success: true,
        })
    }catch( error){
        console.log(error);
    }
}

// code for the comment section
export const addComment= async(req,resp)=>{
    try{
        const postId= req.params.id;
        const commentKrneWalaUserKiId= req.id;

        const {text}= req.body;
        const post= await Post.findById(postId);
        if(!text){
            return resp.status(400).json({
                message: 'text is required',
                success: false
            });
        }

        const comment= await Comment.create({
            text,
            author: commentKrneWalaUserKiId,
            post: postId
        }).populate({
            path: 'author',
            select: "username, profilePicture",
        });

        post.comments.push(comment._id);
        await post.save();

        return resp.status(201).json({
            message: 'comment added',
            comment,
            success: true
        })
    }catch(error){
        console.log(error);
    }
};
export const getCommentsOfPost= async(req,resp)=>{
    try{
        const postId= req.params.id;

        const comments= await Comment.find({post: postId}).populate('author','username, profilePicture');

        if(!comments){
            return resp.status(404).json({
                message: 'No Comments found for this post',
                success: false,
            })
        }

        return resp.status(200).json({
            success: true,
            comments
        });
    }catch(error){
        console.log(error);
    }
}
export const deletePost= async (req,resp)=>{
    try{
        const postId= req.params.id;
        const authorId= req.id;

        const post= await Post.findById(postId);
        if(!post){
            return resp.status(404).json({
                message: 'Post not found',
                success: false,
            }); 
        }

        // check if the logged in user is the owner of the post
        if(post.author.toString() != authorId){
            return resp.status(403).json({
                message: 'Unauthorized'
            })
        }

        // delete post
        await Post.findByIdAndDelete(postId);

        //remove the post id form user all post
        let user= await User.findById(authorId);
        user.posts = user.posts.filter(id=> id.toString()!= postId);
        await user.save();

        //delete associated comments
        await Comment.deleteMany({post: postId});

        return resp.status(200).json({
            message: 'Post deleted',
            success: true,
        })

    }catch(error){
        console.log(error);
    }
}

export const bookmarkPost= async (req,resp)=>{
    try{
        const postId= req.params.id;
        const authorId= req.id;
        const post= await Post.findById(postId);
        if(!post){
            return resp.status(404).json({
                message: 'Post not found',
                success: false
            })
        }

        const user= await User.findById(authorId);
        if(user.bookmarks.includes(post._id)){
            // if already bookmarked -> then remove from the bookmark
            await user.updateOne({$pull:{bookmarks:post._id}});
            await user.save();
            return resp.status(200).json({
                type:'unsaved',
                message: 'Post removed from bookmark',
                success: true
            })
        }else{
            // if not bookmarked -> then bookmark it.
            await user.updateOne({$addToSet:{bookmarks:post._id}});
            await user.save();
            return resp.status(200).json({
                type:'saved',
                message: 'Post bookmarked',
                success: true
            })
        }
    }catch(error){
        console.log(error);
    }
}

// Do API testing of post's functionalities by yourself.