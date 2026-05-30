const User = require("../models/User");
const {
  deleteCloudinaryAsset,
  getCloudinaryPublicIdFromUrl,
  uploadAvatarToCloudinary,
} = require("../utils/cloudinaryUpload");

const MAX_BIO_LENGTH = 300;

const formatProfile = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  bio: user.bio,
  authProvider: user.authProvider,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const isValidAvatarUrl = (value) => {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch (error) {
    return false;
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      profile: formatProfile(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch profile.",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, avatar, bio } = req.body;
    const updates = {};

    if (typeof name === "string") {
      const trimmedName = name.trim();

      if (trimmedName.length < 2 || trimmedName.length > 50) {
        return res.status(400).json({
          success: false,
          message: "Name must be between 2 and 50 characters.",
        });
      }

      updates.name = trimmedName;
    }

    if (typeof avatar === "string") {
      const trimmedAvatar = avatar.trim();

      if (!isValidAvatarUrl(trimmedAvatar)) {
        return res.status(400).json({
          success: false,
          message: "Avatar must be a valid http or https image URL.",
        });
      }

      updates.avatar = trimmedAvatar || undefined;
    }

    if (typeof bio === "string") {
      const trimmedBio = bio.trim();

      if (trimmedBio.length > MAX_BIO_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Bio cannot exceed ${MAX_BIO_LENGTH} characters.`,
        });
      }

      updates.bio = trimmedBio;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profile: formatProfile(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile.",
    });
  }
};

const uploadProfileAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Avatar image is required.",
      });
    }

    const existingUser = await User.findById(req.user._id).select("avatar");
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const uploadResult = await uploadAvatarToCloudinary(req.file.buffer);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: uploadResult.secure_url },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const oldAvatarPublicId = getCloudinaryPublicIdFromUrl(existingUser.avatar);
    if (oldAvatarPublicId && existingUser.avatar !== uploadResult.secure_url) {
      deleteCloudinaryAsset(oldAvatarPublicId, "image").catch((deleteError) => {
        console.error(`Failed to delete old avatar: ${deleteError.message}`);
      });
    }

    return res.status(200).json({
      success: true,
      message: "Avatar updated successfully.",
      avatar: uploadResult.secure_url,
      upload: uploadResult,
      profile: formatProfile(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload avatar.",
    });
  }
};

module.exports = {
  getMyProfile,
  updateProfile,
  uploadProfileAvatar,
};
