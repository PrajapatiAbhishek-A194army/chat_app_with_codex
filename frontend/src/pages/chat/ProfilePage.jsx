import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Mail, Pencil } from "lucide-react";
import ProfileModal from "../../components/chat/ProfileModal";
import useAuth from "../../hooks/useAuth";
import {
  getMyProfile,
  updateProfile,
  uploadAvatar,
} from "../../services/profileService";

const getInitial = (name = "") => name.trim().charAt(0).toUpperCase() || "?";

const ProfilePage = () => {
  const { refreshUser, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getMyProfile();
        setProfile(data.profile);
      } catch (loadError) {
        setError(loadError.message || "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleUpdateProfile = async (payload) => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      setUploadProgress(0);
      const { avatarFile, ...profilePayload } = payload;
      const shouldKeepAvatarUrl = !avatarFile;
      const data = await updateProfile({
        ...profilePayload,
        avatar: shouldKeepAvatarUrl ? profilePayload.avatar : undefined,
      });
      let nextProfile = data.profile;

      if (avatarFile) {
        const avatarData = await uploadAvatar(avatarFile, (event) => {
          if (!event.total) {
            return;
          }

          setUploadProgress(Math.round((event.loaded * 100) / event.total));
        });
        nextProfile = avatarData.profile;
      }

      setProfile(nextProfile);
      setUser((current) => ({
        ...current,
        ...nextProfile,
      }));
      await refreshUser();
      setMessage(avatarFile ? "Profile and avatar updated successfully." : data.message);
      setIsEditing(false);
    } catch (updateError) {
      setError(updateError.message || "Unable to update profile.");
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-lg bg-white shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-black text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            to="/chat"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Chat
          </Link>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-black text-white hover:bg-sky-700 disabled:bg-slate-300"
            disabled={!profile}
            onClick={() => setIsEditing(true)}
            type="button"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading profile...
          </div>
        ) : null}

        {error ? (
          <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            {message}
          </div>
        ) : null}

        {profile ? (
          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-900 text-3xl font-black text-white dark:bg-sky-600">
                {profile.avatar ? (
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={profile.avatar}
                  />
                ) : (
                  getInitial(profile.name)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-3xl font-black text-slate-950 dark:text-white">
                  {profile.name}
                </h1>
                <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {profile.email}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    Joined{" "}
                    {new Date(profile.createdAt).toLocaleDateString([], {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-sm font-black uppercase tracking-normal text-slate-500 dark:text-slate-400">
                About
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800 dark:text-slate-200">
                {profile.bio || "No bio added yet."}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <ProfileModal
        isOpen={isEditing}
        loading={saving}
        onClose={() => setIsEditing(false)}
        onSubmit={handleUpdateProfile}
        profile={profile}
        uploadProgress={uploadProgress}
      />
    </main>
  );
};

export default ProfilePage;
