import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";


export const register = async (req, resp) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return resp.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            })
        }
        const user = await User.findOne({ email });
        if (user) {
            return resp.status(401).json({
                message: "Try different email",
                success: false,
            });
        };
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username,
            email,
            password: hashedPassword
        });
        return resp.status(201).json({
            message: "Account Created Successfully",
            success: true,
        });
    }
    catch (error) {
        console.log(error);
    }
}

export const login = async (req, resp) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return resp.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }
        let user = await User.findOne({ email });
        if (!user) {
            return resp.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return resp.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        }

        const token = await jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1d' });

        // populate each posts in the post array
        const populatedPosts= await Promise.all(
            user.posts.map(async (postId)=>{
                const post= await Post.findById(postId);
                if(post.author.equals(user._id)){
                    return post;
                }
                return null;
            })
        )
        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: populatedPosts
        }

        return resp.cookie('token', token, { httpOnly: true, someSite: 'strict', maxAge: 1 * 24 * 60 * 60 * 1000 }).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user
        });


    } catch (error) {
        console.log(error);
    }
};

export const logout = async (_, resp) => {
    try {
        return resp.cookie("token", "", { maxAge: 0 }).json({
            message: 'Logged out successfully',
            success: true
        });
    } catch (error) {
        console.log(error);
    }
};

export const getProfile = async (req, resp) => {
    try {
        const userId = req.params.id;
        let user = await User.findById(userId).select('-password');
        return resp.status(200).json({
            user,
            success: true
        });
    } catch (error) {
        console.log(error);
    }
};

export const editProfile = async (req, resp) => {
    try {
        const userId = req.id;
        const {bio, gender} = req.body;
        const profilePicture = req.file;

        //using the cloudinary for image & photo upload
        let cloudResponse;
        if (profilePicture){
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return resp.status(404).json({
                message: 'User not found',
                success: false
            })
        };
        //bio section
        if (bio) user.bio = bio;
        if (gender) user.gender = gender;
        if (profilePicture) user.profilePicture = cloudResponse.secure_url;

        await user.save();

        return resp.status(200).json({
            message: 'Profile updated.',
            success: true,
            user
        })

    } catch (error) {
        console.log(error);
    }
};

export const getSuggestedusers = async (req, resp) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select('-password');
        if (!suggestedUsers) {
            return resp.status(400).json({
                message: 'Currently do not have any users',
            })
        };
        return resp.status(200).json({
            success: true,
            users: suggestedUsers
        })
    } catch (error) {
        console.log(error);
    }
};
export const followOrUnfollow = async (req, resp) => {
    try {
        const followKrneWala = req.id;
        const jiskofollowKrunga = req.params.id;
        if (followKrneWala == jiskofollowKrunga) {
            return resp.status(400).json({
                message: 'You cannot follow/unfollow yourself',
                success: false
            });
        }
        const user = await User.findById(followKrneWala);
        const targetUser = await User.findById(jiskofollowKrunga);

        if (!user || !targetUser) {
            return resp.status(400).json({
                message: 'User not found',
                success: false
            });
        }
        // mai check krunga ki follow krna hai ya unfollow
        const isFollowing = user.following.includes(jiskofollowKrunga);
        if (isFollowing) {
            // unfoloow logic aayega
            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $pull: { following: jiskofollowKrunga }}),
                User.updateOne({ _id: jiskofollowKrunga }, { $pull: { followers: followKrneWala }})    
            ])
            return resp.status(200).json({
                message:'Unfollowed successfully'
            })
        }
        else {
            //follow logic aayega
            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $push: { following: jiskofollowKrunga }}),
                User.updateOne({ _id: jiskofollowKrunga }, { $push: { followers: followKrneWala }})    
            ])
            return resp.status(200).json({
                message:'followed successfully'
            })
        }
        }catch (error) {
    console.log(error);
}
};