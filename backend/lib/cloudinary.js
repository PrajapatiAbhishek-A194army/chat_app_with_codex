const { v2: cloudinary } = require("cloudinary");

const requiredEnvVars = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const getMissingCloudinaryEnvVars = () =>
  requiredEnvVars.filter((key) => !process.env[key]);

const configureCloudinary = () => {
  const missingEnvVars = getMissingCloudinaryEnvVars();

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing Cloudinary environment variables: ${missingEnvVars.join(", ")}`
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
};

module.exports = {
  cloudinary,
  configureCloudinary,
  getMissingCloudinaryEnvVars,
};
