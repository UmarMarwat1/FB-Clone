"use client";
import { useEffect, useState } from "react";
import { supabase, getCurrentSession, getProfile, updateProfile } from "../../../lib/supabaseCLient"
import styles from "./profile.module.css";

export default function ProfilePage() {
  const [profile, setProfile] = useState({ username: "", full_name: "", avatar_url: "" });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError("");
      const session = await getCurrentSession();
      if (!session?.user) {
        setError("User not logged in");
        setLoading(false);
        return;
      }
      try {
        const data = await getProfile(session.user.id);
        setProfile({
          username: data.username || "",
          full_name: data.full_name || "",
          avatar_url: data.avatar_url || "",
        });
      } catch (err) {
        setError("Profile not found");
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const session = await getCurrentSession();
    if (!session?.user) {
      setError("User not logged in");
      setLoading(false);
      return;
    }
    try {
      await updateProfile(session.user.id, profile);
      setSuccess("Profile updated successfully!");
      setEditing(false);
    } catch (err) {
      setError("Update failed");
    }
    setLoading(false);
  };

  if (loading) return <div className={styles.profileCard}>Loading...</div>;
  if (error) return <div className={styles.profileCard}>Error: {error}</div>;

  return (
    <div className={styles.profileCard}>
      <h2>My Profile</h2>
      {success && <div className={styles.success}>{success}</div>}
      {editing ? (
        <form onSubmit={handleSubmit} className={styles.profileForm}>
          <label className={styles.formLabel}>
            Username:
            <input name="username" value={profile.username} onChange={handleChange} required className={styles.formInput} />
          </label>
          <label className={styles.formLabel}>
            Full Name:
            <input name="full_name" value={profile.full_name} onChange={handleChange} className={styles.formInput} />
          </label>
          <label className={styles.formLabel}>
            Avatar URL:
            <input name="avatar_url" value={profile.avatar_url} onChange={handleChange} className={styles.formInput} />
          </label>
          <button type="submit" className={styles.profileButton}>Save</button>
          <button type="button" onClick={() => setEditing(false)} className={styles.cancelButton}>Cancel</button>
        </form>
      ) : (
        <div>
          <div className={styles.avatarWrap}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className={styles.avatar} />
            ) : (
              <div className={styles.avatarPlaceholder}>No Avatar</div>
            )}
          </div>
          <p><b>Username:</b> {profile.username}</p>
          <p><b>Full Name:</b> {profile.full_name}</p>
          <button onClick={() => setEditing(true)} className={styles.profileButton}>Edit Profile</button>
        </div>
      )}
    </div>
  );
} 