const streamifier = require("streamifier");
const { cloudinary, configureCloudinary } = require("../lib/cloudinary");

const getOptimizedDeliveryUrl = (result) => {
  const baseOptions = {
    resource_type: result.resource_type,
    secure: true,
    quality: "auto",
  };

  if (result.resource_type === "image") {
    baseOptions.fetch_format = "auto";
  }

  return cloudinary.url(result.public_id, baseOptions);
};

const uploadBufferToCloudinary = ({
  buffer,
  folder,
  resourceType = "image",
  transformation,
}) => {
  if (!buffer) {
    return Promise.reject(new Error("File buffer is required for upload."));
  }

  configureCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        transformation,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          secure_url: getOptimizedDeliveryUrl(result),
          public_id: result.public_id,
          resource_type: result.resource_type,
        });
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

const uploadAvatarToCloudinary = (buffer) =>
  uploadBufferToCloudinary({
    buffer,
    folder: "chat-app/avatars",
    resourceType: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });

const uploadChatImageToCloudinary = (buffer) =>
  uploadBufferToCloudinary({
    buffer,
    folder: "chat-app/messages/images",
    resourceType: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });

const uploadChatVideoToCloudinary = (buffer) =>
  uploadBufferToCloudinary({
    buffer,
    folder: "chat-app/messages/videos",
    resourceType: "video",
    transformation: [{ quality: "auto" }],
  });

const deleteCloudinaryAsset = async (publicId, resourceType = "image") => {
  if (!publicId) {
    return null;
  }

  configureCloudinary();

  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
};

const getCloudinaryPublicIdFromUrl = (assetUrl) => {
  if (!assetUrl || typeof assetUrl !== "string") {
    return "";
  }

  try {
    const parsedUrl = new URL(assetUrl);
    const [, uploadPath] = parsedUrl.pathname.split("/upload/");

    if (!uploadPath) {
      return "";
    }

    const pathWithoutTransformations = uploadPath
      .split("/")
      .filter((segment) => segment && !segment.startsWith("q_") && !segment.startsWith("f_"))
      .join("/");
    const pathWithoutVersion = pathWithoutTransformations.replace(/^v\d+\//, "");

    return pathWithoutVersion.replace(/\.[^/.]+$/, "");
  } catch (error) {
    return "";
  }
};

module.exports = {
  deleteCloudinaryAsset,
  getCloudinaryPublicIdFromUrl,
  uploadAvatarToCloudinary,
  uploadBufferToCloudinary,
  uploadChatImageToCloudinary,
  uploadChatVideoToCloudinary,
};
