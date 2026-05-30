const multer = require("multer");
const path = require("path");

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"];
const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;

const formatAllowedExtensions = (extensions) =>
  extensions.map((extension) => extension.replace(".", "")).join(", ");

const createUploadMiddleware = ({
  allowedMimeTypes,
  allowedExtensions,
  maxFileSize,
  maxFileSizeLabel,
  fieldName,
  fileLabel,
}) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSize,
      files: 1,
    },
    fileFilter: (req, file, callback) => {
      const extension = path.extname(file.originalname || "").toLowerCase();
      const hasAllowedMimeType = allowedMimeTypes.includes(file.mimetype);
      const hasAllowedExtension = allowedExtensions.includes(extension);

      if (!hasAllowedMimeType || !hasAllowedExtension) {
        callback(
          new Error(
            `${fileLabel} must be one of: ${formatAllowedExtensions(
              allowedExtensions
            )}.`
          )
        );
        return;
      }

      callback(null, true);
    },
  });

  return (req, res, next) => {
    req.uploadValidation = {
      fileLabel,
      maxFileSizeLabel,
    };

    upload.single(fieldName)(req, res, next);
  };
};

const uploadAvatar = createUploadMiddleware({
  allowedMimeTypes: IMAGE_MIME_TYPES,
  allowedExtensions: IMAGE_EXTENSIONS,
  maxFileSize: IMAGE_MAX_SIZE,
  maxFileSizeLabel: "5MB",
  fieldName: "avatar",
  fileLabel: "Avatar image",
});

const uploadChatImage = createUploadMiddleware({
  allowedMimeTypes: IMAGE_MIME_TYPES,
  allowedExtensions: IMAGE_EXTENSIONS,
  maxFileSize: IMAGE_MAX_SIZE,
  maxFileSizeLabel: "5MB",
  fieldName: "image",
  fileLabel: "Chat image",
});

const uploadChatVideo = createUploadMiddleware({
  allowedMimeTypes: VIDEO_MIME_TYPES,
  allowedExtensions: VIDEO_EXTENSIONS,
  maxFileSize: VIDEO_MAX_SIZE,
  maxFileSizeLabel: "50MB",
  fieldName: "video",
  fileLabel: "Chat video",
});

const handleUploadError = (error, req, res, next) => {
  if (!error) {
    return next();
  }

  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    const fileLabel = req.uploadValidation?.fileLabel || "Uploaded file";
    const maxFileSizeLabel = req.uploadValidation?.maxFileSizeLabel || "the allowed limit";

    return res.status(400).json({
      success: false,
      message: `${fileLabel} must be ${maxFileSizeLabel} or smaller.`,
    });
  }

  return res.status(400).json({
    success: false,
    message: error.message || "File upload failed.",
  });
};

module.exports = {
  IMAGE_MIME_TYPES,
  IMAGE_EXTENSIONS,
  IMAGE_MAX_SIZE,
  VIDEO_MIME_TYPES,
  VIDEO_EXTENSIONS,
  VIDEO_MAX_SIZE,
  createUploadMiddleware,
  handleUploadError,
  uploadAvatar,
  uploadChatImage,
  uploadChatVideo,
};
