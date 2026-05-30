import { useEffect, useState } from "react";
import { ImageUp, X } from "lucide-react";

const AVATAR_VALIDATION = {
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  maxSize: 5 * 1024 * 1024,
  maxSizeLabel: "5MB",
};

const getFileExtension = (fileName = "") => {
  const extensionIndex = fileName.lastIndexOf(".");
  return extensionIndex === -1 ? "" : fileName.slice(extensionIndex).toLowerCase();
};

const ProfileModal = ({
  isOpen,
  loading,
  onClose,
  onSubmit,
  profile,
  uploadProgress,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    avatar: "",
    bio: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    if (profile && isOpen) {
      setFormData({
        name: profile.name || "",
        avatar: profile.avatar || "",
        bio: profile.bio || "",
      });
      setAvatarFile(null);
      setFileError("");
    }
  }, [isOpen, profile]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    setFileError("");

    if (!file) {
      setAvatarFile(null);
      return;
    }

    const extension = getFileExtension(file.name);
    const hasAllowedType = AVATAR_VALIDATION.acceptedTypes.includes(file.type);
    const hasAllowedExtension =
      AVATAR_VALIDATION.acceptedExtensions.includes(extension);

    if (!hasAllowedType || !hasAllowedExtension) {
      setAvatarFile(null);
      setFileError("Avatar must be JPG, PNG, or WEBP.");
      return;
    }

    if (file.size > AVATAR_VALIDATION.maxSize) {
      setAvatarFile(null);
      setFileError(`Avatar image must be ${AVATAR_VALIDATION.maxSizeLabel} or smaller.`);
      return;
    }

    setAvatarFile(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (fileError) {
      return;
    }

    onSubmit({
      ...formData,
      avatarFile,
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4">
      <section
        aria-labelledby="profile-modal-title"
        className="w-full max-w-lg rounded-lg bg-white shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2
            className="text-lg font-black text-slate-950 dark:text-white"
            id="profile-modal-title"
          >
            Edit profile
          </h2>
          <button
            aria-label="Close profile editor"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form className="grid gap-4 p-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
            Display name
            <input
              className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-sky-900"
              maxLength={50}
              minLength={2}
              name="name"
              onChange={handleChange}
              required
              value={formData.name}
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
            Avatar URL
            <input
              className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-sky-900"
              name="avatar"
              onChange={handleChange}
              placeholder="https://example.com/avatar.jpg"
              type="url"
              value={formData.avatar}
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
            Upload avatar
            <span className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:border-sky-500 hover:bg-sky-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <ImageUp className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {avatarFile ? avatarFile.name : "Choose image from device"}
              </span>
              <input
                accept={AVATAR_VALIDATION.acceptedTypes.join(",")}
                className="sr-only"
                onChange={handleAvatarFileChange}
                type="file"
              />
            </span>
          </label>

          {fileError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
              {fileError}
            </p>
          )}

          {loading && uploadProgress > 0 && (
            <div className="grid gap-2">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-sky-600 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Uploading avatar {uploadProgress}%
              </p>
            </div>
          )}

          <label className="grid gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
            Bio
            <textarea
              className="min-h-28 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold leading-6 text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-sky-900"
              maxLength={300}
              name="bio"
              onChange={handleChange}
              value={formData.bio}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="min-h-11 rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-11 rounded-lg bg-sky-600 px-4 text-sm font-black text-white hover:bg-sky-700 disabled:bg-slate-300"
              disabled={loading}
              type="submit"
            >
              {loading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ProfileModal;
