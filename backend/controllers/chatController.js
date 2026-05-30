const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const {
  deleteCloudinaryAsset,
  getCloudinaryPublicIdFromUrl,
  uploadChatImageToCloudinary,
  uploadChatVideoToCloudinary,
} = require("../utils/cloudinaryUpload");
const {
  emitMessageDeletedToParticipants,
  emitMessageToParticipants,
  isUserOnline,
} = require("../socket/socketServer");

const MAX_MESSAGE_LENGTH = 2000;

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeMessageText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return escapeHtml(value.trim().replace(/\s+/g, " "));
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getPagination = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 30, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const formatChatUser = (user, metadata = {}) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  bio: user.bio,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
  createdAt: user.createdAt,
  latestMessage: metadata.latestMessage
    ? formatMessage(metadata.latestMessage)
    : null,
  unreadCount: metadata.unreadCount || 0,
});

const formatMessage = (message) => ({
  id: message._id,
  sender: message.sender,
  receiver: message.receiver,
  text: message.text,
  imageUrl: message.imageUrl,
  videoUrl: message.videoUrl,
  type: message.type || "text",
  isRead: message.isRead,
  deliveredAt: message.deliveredAt,
  readAt: message.readAt,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const buildChatMetadata = async (currentUserId, users) => {
  const metadataByUserId = new Map();

  await Promise.all(
    users.map(async (user) => {
      const participantId = user._id;
      const conversationQuery = Message.getConversationQuery(
        currentUserId,
        participantId
      );

      const [latestMessage, unreadCount] = await Promise.all([
        Message.findOne(conversationQuery)
          .sort({ createdAt: -1 })
          .select("sender receiver text imageUrl videoUrl type isRead createdAt")
          .lean(),
        Message.countDocuments({
          sender: participantId,
          receiver: currentUserId,
          isRead: false,
        }),
      ]);

      metadataByUserId.set(participantId.toString(), {
        latestMessage,
        unreadCount,
      });
    })
  );

  return metadataByUserId;
};

const getChatUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const query = { _id: { $ne: currentUserId } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("name email avatar bio isOnline lastSeen createdAt")
      .sort({ isOnline: -1, name: 1 })
      .lean();

    const metadataByUserId = await buildChatMetadata(currentUserId, users);
    const chatUsers = users.map((user) =>
      formatChatUser(user, metadataByUserId.get(user._id.toString()))
    );

    return res.status(200).json({
      success: true,
      users: chatUsers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch chat users.",
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid chat user id is required.",
      });
    }

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot fetch a conversation with yourself.",
      });
    }

    const participant = await User.findById(userId).select("_id");
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Chat user not found.",
      });
    }

    const { page, limit, skip } = getPagination(req.query);
    const conversationQuery = Message.getConversationQuery(currentUserId, userId);

    const [messages, total] = await Promise.all([
      Message.find(conversationQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(conversationQuery),
    ]);

    return res.status(200).json({
      success: true,
      messages: messages.reverse().map(formatMessage),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch messages.",
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const receiverId = req.body.receiver || req.body.receiverId;
    const rawText = req.body.text || req.body.message;
    const text = sanitizeMessageText(rawText);

    if (!isValidObjectId(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Valid receiver id is required.",
      });
    }

    if (receiverId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a message to yourself.",
      });
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message text is required.",
      });
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    const receiver = await User.findById(receiverId).select("_id");
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found.",
      });
    }

    const message = await Message.create({
      sender: currentUserId,
      receiver: receiverId,
      text,
      type: "text",
      deliveredAt: isUserOnline(receiverId) ? new Date() : undefined,
    });
    const formattedMessage =
      emitMessageToParticipants(message) || formatMessage(message);

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: formattedMessage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send message.",
    });
  }
};

const sendImageMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const receiverId = req.body.receiver || req.body.receiverId;
    const rawText = req.body.text || req.body.message || "";
    const text = sanitizeMessageText(rawText);

    if (!isValidObjectId(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Valid receiver id is required.",
      });
    }

    if (receiverId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot send an image to yourself.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required.",
      });
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    const receiver = await User.findById(receiverId).select("_id");
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found.",
      });
    }

    const uploadResult = await uploadChatImageToCloudinary(req.file.buffer);
    const deliveredAt = isUserOnline(receiverId) ? new Date() : undefined;
    const message = await Message.create({
      sender: currentUserId,
      receiver: receiverId,
      text: text || undefined,
      imageUrl: uploadResult.secure_url,
      type: "image",
      deliveredAt,
    });
    const formattedMessage = formatMessage(message);
    const emittedMessage = emitMessageToParticipants(message) || formattedMessage;

    return res.status(201).json({
      success: true,
      message: "Image sent successfully.",
      upload: uploadResult,
      data: emittedMessage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send image.",
    });
  }
};

const sendVideoMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const receiverId = req.body.receiver || req.body.receiverId;
    const rawText = req.body.text || req.body.message || "";
    const text = sanitizeMessageText(rawText);

    if (!isValidObjectId(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Valid receiver id is required.",
      });
    }

    if (receiverId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a video to yourself.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required.",
      });
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    const receiver = await User.findById(receiverId).select("_id");
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found.",
      });
    }

    const uploadResult = await uploadChatVideoToCloudinary(req.file.buffer);
    const deliveredAt = isUserOnline(receiverId) ? new Date() : undefined;
    const message = await Message.create({
      sender: currentUserId,
      receiver: receiverId,
      text: text || undefined,
      videoUrl: uploadResult.secure_url,
      type: "video",
      deliveredAt,
    });
    const formattedMessage = formatMessage(message);
    const emittedMessage = emitMessageToParticipants(message) || formattedMessage;

    return res.status(201).json({
      success: true,
      message: "Video sent successfully.",
      upload: uploadResult,
      data: emittedMessage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send video.",
    });
  }
};

const markMessageAsRead = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { messageId } = req.params;

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Valid message id is required.",
      });
    }

    const message = await Message.findOne({
      _id: messageId,
      receiver: currentUserId,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    return res.status(200).json({
      success: true,
      message: "Message marked as read.",
      data: formatMessage(message),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to mark message as read.",
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { messageId } = req.params;

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({
        success: false,
        message: "Valid message id is required.",
      });
    }

    const message = await Message.findOne({
      _id: messageId,
      sender: currentUserId,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    const mediaUrl = message.imageUrl || message.videoUrl;
    const resourceType = message.videoUrl ? "video" : "image";
    const publicId = getCloudinaryPublicIdFromUrl(mediaUrl);

    await Message.findByIdAndDelete(message._id);

    if (publicId) {
      deleteCloudinaryAsset(publicId, resourceType).catch((deleteError) => {
        console.error(`Failed to delete message media: ${deleteError.message}`);
      });
    }

    emitMessageDeletedToParticipants(message);

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully.",
      deletedMessageId: message._id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete message.",
    });
  }
};

module.exports = {
  deleteMessage,
  getChatUsers,
  getMessages,
  sendImageMessage,
  sendMessage,
  sendVideoMessage,
  markMessageAsRead,
};
