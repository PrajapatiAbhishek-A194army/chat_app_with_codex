const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Message sender is required."],
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Message receiver is required."],
      index: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters."],
    },
    imageUrl: {
      type: String,
      default: undefined,
      trim: true,
    },
    videoUrl: {
      type: String,
      default: undefined,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video"],
      default: "text",
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: undefined,
    },
    deliveredAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.pre("validate", function validateMessageContent(next) {
  if (this.type === "text" && !this.text) {
    return next(new Error("Message text is required."));
  }

  if (this.type === "image" && !this.imageUrl) {
    return next(new Error("Image URL is required for image messages."));
  }

  if (this.type === "video" && !this.videoUrl) {
    return next(new Error("Video URL is required for video messages."));
  }

  return next();
});

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });

messageSchema.statics.getConversationQuery = function getConversationQuery(
  userId,
  participantId
) {
  return {
    $or: [
      { sender: userId, receiver: participantId },
      { sender: participantId, receiver: userId },
    ],
  };
};

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
