"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getCurrentSession } from "../../../../lib/supabaseCLient";
import Header from "../../feed/components/Header";
import styles from "./editProfile.module.css";

export default function EditProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    username: "",
    full_name: "",
    bio: "",
    location: "",
    hometown: "",
    current_city: "",
    relationship_status: "",
    birthday: "",
    gender: "",
    phone: "",
    email_public: "",
    website: "",
    avatar_url: "",
    cover_url: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const session = await getCurrentSession();
        if (!session?.user) {
          router.push("/login");
          return;
        }

        setUser(session.user);

        // Fetch existing profile data
        const response = await fetch(`/api/profile/${session.user.id}`);
        const data = await response.json();

        if (data.success) {
          setProfile({
            username: data.profile.username || "",
            full_name: data.profile.full_name || "",
            bio: data.profile.bio || "",
            location: data.profile.location || "",
            hometown: data.profile.hometown || "",
            current_city: data.profile.current_city || "",
            relationship_status: data.profile.relationship_status || "",
            birthday: data.profile.birthday || "",
            gender: data.profile.gender || "",
            phone: data.profile.phone || "",
            email_public: data.profile.email_public || "",
            website: data.profile.website || "",
            avatar_url: data.profile.avatar_url || "",
            cover_url: data.profile.cover_url || ""
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
      } else {
        setError("Failed to upload avatar");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      setError("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('cover', file);

      const response = await fetch('/api/upload/cover', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setProfile(prev => ({ ...prev, cover_url: data.cover_url }));
      } else {
        setError("Failed to upload cover photo");
      }
    } catch (err) {
      console.error("Cover upload error:", err);
      setError("Failed to upload cover photo");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!profile.username.trim()) {
      setError("Username is required");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Get the current session to include access token in request
      const session = await getCurrentSession();
      
      const response = await fetch(`/api/profile/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(profile),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess("Profile updated successfully!");
        
        // Redirect to profile page after successful update
        setTimeout(() => {
          router.push(`/profile/${profile.username}`);
        }, 2000);
      } else {
        setError(data.error || "Failed to update profile");
      }
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className={styles.editPage}>
      <Header user={user} setUser={() => {}} />
      <div className={styles.editContainer}>
        <div className={styles.editCard}>
          <div className={styles.header}>
            <h1>Edit Profile</h1>
            <button 
              type="button" 
              onClick={() => router.back()}
              className={styles.backBtn}
            >
              Cancel
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <form onSubmit={handleSubmit} className={styles.editForm}>
            {/* Cover Photo Section */}
            <div className={styles.coverSection}>
              <label>Cover Photo</label>
              <div className={styles.coverContainer}>
                {profile.cover_url ? (
                  <Image
                    src={profile.cover_url} 
                    alt="Cover" 
                    width={500}
                    height={200}
                    className={styles.coverPreview}
                  />
                ) : (
                  <div 
                    className={styles.coverPlaceholder}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    Click to add cover photo
                  </div>
                )}
                <button
                  type="button"
                  className={styles.changeCoverBtn}
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                >
                  {uploadingCover ? "..." : "📷"}
                </button>
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                style={{ display: "none" }}
              />
            </div>

            {/* Avatar Section */}
            <div className={styles.avatarSection}>
              <label>Profile Picture</label>
              <div className={styles.avatarContainer}>
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    width={100}
                    height={100}
                    className={styles.avatarPreview}
                  />
                ) : (
                  <div 
                    className={styles.avatarPlaceholder}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    👤
                  </div>
                )}
                <button
                  type="button"
                  className={styles.changeAvatarBtn}
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? "..." : "📷"}
                </button>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: "none" }}
              />
            </div>

            {/* Basic Information */}
            <div className={styles.formSection}>
              <h3>Basic Information</h3>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="username">Username *</label>
                  <input
                    type="text"
                    id="username"
                    value={profile.username}
                    onChange={(e) => setProfile({...profile, username: e.target.value})}
                    required
                    placeholder="Enter username"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="full_name">Full Name</label>
                  <input
                    type="text"
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="location">Current Location</label>
                  <input
                    type="text"
                    id="location"
                    value={profile.location}
                    onChange={(e) => setProfile({...profile, location: e.target.value})}
                    placeholder="City, Country"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="hometown">Hometown</label>
                  <input
                    type="text"
                    id="hometown"
                    value={profile.hometown}
                    onChange={(e) => setProfile({...profile, hometown: e.target.value})}
                    placeholder="Where you're from"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="relationship_status">Relationship Status</label>
                  <select
                    id="relationship_status"
                    value={profile.relationship_status}
                    onChange={(e) => setProfile({...profile, relationship_status: e.target.value})}
                  >
                    <option value="">Select status</option>
                    <option value="single">Single</option>
                    <option value="in_relationship">In a relationship</option>
                    <option value="married">Married</option>
                    <option value="complicated">It&apos;s complicated</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="birthday">Birthday</label>
                  <input
                    type="date"
                    id="birthday"
                    value={profile.birthday}
                    onChange={(e) => setProfile({...profile, birthday: e.target.value})}
                    className={styles.dateInput}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="gender">Gender</label>
                  <input
                    type="text"
                    id="gender"
                    value={profile.gender}
                    onChange={(e) => setProfile({...profile, gender: e.target.value})}
                    placeholder="Gender"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="phone">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="email_public">Public Email</label>
                  <input
                    type="email"
                    id="email_public"
                    value={profile.email_public}
                    onChange={(e) => setProfile({...profile, email_public: e.target.value})}
                    placeholder="Public email address"
                  />
                  <small className={styles.helpText}>This email will be visible to other users</small>
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="website">Website</label>
                  <input
                    type="url"
                    id="website"
                    value={profile.website}
                    onChange={(e) => setProfile({...profile, website: e.target.value})}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </div>

            {/* Submit Section */}
            <div className={styles.submitSection}>
              <button 
                type="submit" 
                className={styles.saveBtn}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
