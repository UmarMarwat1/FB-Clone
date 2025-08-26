"use client";
import { useState, useEffect } from "react";
import { getCurrentSession } from "../../../../lib/supabaseCLient";
import DatePicker from "../DatePicker";
import styles from "./AboutSection.module.css";

export default function AboutSection({ userId, isOwner, onUpdate, compact = false, mobile = false }) {
  const [profile, setProfile] = useState(null);
  const [education, setEducation] = useState([]);
  const [work, setWork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchAboutData();
  }, [userId]);

  const fetchAboutData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/profile/${userId}`);
      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);
        setEducation(data.profile.user_education || []);
        setWork(data.profile.user_work || []);
      } else {
        setError("Failed to load profile data");
      }

    } catch (err) {
      console.error("Error fetching about data:", err);
      setError("Failed to load about data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (section, item = null) => {
    setEditingSection(section);
    
    if (section === "basic" && profile) {
      setFormData({
        bio: profile.bio || "",
        location: profile.location || "",
        hometown: profile.hometown || "",
        current_city: profile.current_city || "",
        relationship_status: profile.relationship_status || "",
        birthday: profile.birthday || "",
        gender: profile.gender || "",
        phone: profile.phone || "",
        email_public: profile.email_public || "",
        website: profile.website || ""
      });
    } else if (section === "education") {
      setFormData(item || {
        institution: "",
        degree: "",
        field_of_study: "",
        start_date: "",
        end_date: "",
        is_current: false
      });
    } else if (section === "work") {
      setFormData(item || {
        company: "",
        position: "",
        location: "",
        start_date: "",
        end_date: "",
        is_current: false,
        description: ""
      });
    }
  };

  const handleSave = async () => {
    try {
      let endpoint = "";
      let method = "POST";
      let body = {};

      if (editingSection === "basic") {
        endpoint = `/api/profile/${userId}`;
        method = "PUT";
        body = formData;
      } else if (editingSection === "education") {
        endpoint = formData.id ? `/api/education/${formData.id}` : `/api/education`;
        method = formData.id ? "PUT" : "POST";
        body = { ...formData, user_id: userId };
      } else if (editingSection === "work") {
        endpoint = formData.id ? `/api/work/${formData.id}` : `/api/work`;
        method = formData.id ? "PUT" : "POST";
        body = { ...formData, user_id: userId };
      }

      // Get the current session to include access token for profile updates
      const session = await getCurrentSession();
      const headers = { "Content-Type": "application/json" };
      
      // Add authorization header for all authenticated operations
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.success) {
        setEditingSection(null);
        fetchAboutData();
        if (editingSection === "basic" && onUpdate) {
          onUpdate({ ...profile, ...formData });
        }
      } else {
        alert("Failed to save changes");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save changes");
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const endpoint = type === "education" ? `/api/education/${id}` : `/api/work/${id}`;
      const response = await fetch(endpoint, { method: "DELETE" });
      
      const data = await response.json();
      if (data.success) {
        fetchAboutData();
      } else {
        alert("Failed to delete item");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete item");
    }
  };

  const renderBasicInfo = () => {
    if (compact) return null;
    
    return (
      <div className={`${styles.section} ${compact ? styles.compact : ''}`}>
        <div className={`${styles.sectionHeader} ${compact ? styles.compact : ''}`}>
          <h3>Basic Information</h3>
          {isOwner && (
            <button 
              onClick={() => handleEdit("basic")}
              className={styles.editBtn}
            >
              Edit
            </button>
          )}
        </div>

        {editingSection === "basic" ? (
          <div className={styles.editForm}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Current Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Current city"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Hometown</label>
                <input
                  type="text"
                  value={formData.hometown}
                  onChange={(e) => setFormData({...formData, hometown: e.target.value})}
                  placeholder="Where you're from"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Relationship Status</label>
                <select
                  value={formData.relationship_status}
                  onChange={(e) => setFormData({...formData, relationship_status: e.target.value})}
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
                <label>Birthday</label>
                <DatePicker
                  value={formData.birthday}
                  onChange={(value) => setFormData({...formData, birthday: value})}
                  placeholder="Select birthday"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Gender</label>
                <input
                  type="text"
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  placeholder="Gender"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Phone number"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email_public}
                  onChange={(e) => setFormData({...formData, email_public: e.target.value})}
                  placeholder="Public email"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
            
            <div className={styles.formActions}>
              <button onClick={handleSave} className={styles.saveBtn}>Save</button>
              <button onClick={() => setEditingSection(null)} className={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className={styles.infoGrid}>
            {profile?.bio && (
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>📝</span>
                <div>
                  <strong>Bio</strong>
                  <p>{profile.bio}</p>
                </div>
              </div>
            )}
            
            {profile?.location && (
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>📍</span>
                <div>
                  <strong>Lives in</strong>
                  <p>{profile.location}</p>
                </div>
              </div>
            )}
            
            {profile?.hometown && (
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>🏠</span>
                <div>
                  <strong>From</strong>
                  <p>{profile.hometown}</p>
                </div>
              </div>
            )}
            
            {profile?.relationship_status && (
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>❤️</span>
                <div>
                  <strong>Relationship Status</strong>
                  <p>{profile.relationship_status}</p>
                </div>
              </div>
            )}
            
            {profile?.birthday && (
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>🎂</span>
                <div>
                  <strong>Birthday</strong>
                  <p>{profile.birthday}</p>
                </div>
              </div>
            )}
            
            {profile?.gender && (
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>👤</span>
                <div>
                  <strong>Gender</strong>
                  <p>{profile.gender}</p>
                </div>
              </div>
            )}
            
            {profile?.phone && (
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>📱</span>
                <div>
                  <strong>Phone</strong>
                  <p>{profile.phone}</p>
                </div>
              </div>
            )}
            
            {profile?.email_public && (
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>📧</span>
                <div>
                  <strong>Email</strong>
                  <p>{profile.email_public}</p>
                </div>
              </div>
            )}
            
            {profile?.website && (
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}>🌐</span>
                <div>
                  <strong>Website</strong>
                  <p>
                    <a href={profile.website} target="_blank" rel="noopener noreferrer">
                      {profile.website}
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderEducation = () => {
    if (compact) return null;
    
    return (
      <div className={`${styles.section} ${compact ? styles.compact : ''}`}>
        <div className={`${styles.sectionHeader} ${compact ? styles.compact : ''}`}>
          <h3>Education</h3>
          {isOwner && (
            <button 
              onClick={() => handleEdit("education")}
              className={styles.editBtn}
            >
              + Add
            </button>
          )}
        </div>

        {education.map(edu => (
          <div key={edu.id} className={styles.timelineItem}>
            <div className={styles.timelineContent}>
              <h4 className={styles.timelineTitle}>{edu.institution}</h4>
              {edu.degree && <p className={styles.timelineSubtitle}><strong>{edu.degree}</strong></p>}
              {edu.field_of_study && <p className={styles.timelineSubtitle}>{edu.field_of_study}</p>}
              <p className={styles.timelinePeriod}>
                {edu.start_date && new Date(edu.start_date).getFullYear()} - {
                  edu.is_current ? "Present" : (edu.end_date && new Date(edu.end_date).getFullYear())
                }
              </p>
            </div>
            {isOwner && (
              <div className={styles.timelineActions}>
                <button onClick={() => handleEdit("education", edu)} className={styles.timelineActionBtn}>Edit</button>
                <button onClick={() => handleDelete("education", edu.id)} className={styles.timelineActionBtn}>Delete</button>
              </div>
            )}
          </div>
        ))}

        {editingSection === "education" && (
          <div className={styles.editForm}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Institution</label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={(e) => setFormData({...formData, institution: e.target.value})}
                  placeholder="University/School name"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Degree</label>
                <input
                  type="text"
                  value={formData.degree}
                  onChange={(e) => setFormData({...formData, degree: e.target.value})}
                  placeholder="Bachelor's, Master's, etc."
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Field of Study</label>
                <input
                  type="text"
                  value={formData.field_of_study}
                  onChange={(e) => setFormData({...formData, field_of_study: e.target.value})}
                  placeholder="Computer Science, Business, etc."
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Start Date</label>
                <DatePicker
                  value={formData.start_date}
                  onChange={(value) => setFormData({...formData, start_date: value})}
                  placeholder="Select start date"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>End Date</label>
                <DatePicker
                  value={formData.end_date}
                  onChange={(value) => setFormData({...formData, end_date: value})}
                  placeholder="Select end date"
                  disabled={formData.is_current}
                />
              </div>
              
              <div className={styles.checkboxGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_current}
                    onChange={(e) => setFormData({...formData, is_current: e.target.checked})}
                  />
                  Currently studying here
                </label>
              </div>
            </div>
            
            <div className={styles.formActions}>
              <button onClick={handleSave} className={styles.saveBtn}>Save</button>
              <button onClick={() => setEditingSection(null)} className={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        )}

        {!editingSection && isOwner && (
          <button onClick={() => handleEdit("education")} className={styles.addNewBtn}>
            <span className={styles.addNewIcon}>+</span>
            Add Education
          </button>
        )}
      </div>
    );
  };

  const renderWork = () => {
    if (compact) return null;
    
    return (
      <div className={`${styles.section} ${compact ? styles.compact : ''}`}>
        <div className={`${styles.sectionHeader} ${compact ? styles.compact : ''}`}>
          <h3>Work Experience</h3>
          {isOwner && (
            <button 
              onClick={() => handleEdit("work")}
              className={styles.editBtn}
            >
              + Add
            </button>
          )}
        </div>

        {work.map(job => (
          <div key={job.id} className={styles.timelineItem}>
            <div className={styles.timelineContent}>
              <h4 className={styles.timelineTitle}>{job.position} at {job.company}</h4>
              {job.location && <p className={styles.timelineSubtitle}>{job.location}</p>}
              {job.description && <p className={styles.timelineDescription}>{job.description}</p>}
              <p className={styles.timelinePeriod}>
                {job.start_date && new Date(job.start_date).getFullYear()} - {
                  job.is_current ? "Present" : (job.end_date && new Date(job.end_date).getFullYear())
                }
              </p>
            </div>
            {isOwner && (
              <div className={styles.timelineActions}>
                <button onClick={() => handleEdit("work", job)} className={styles.timelineActionBtn}>Edit</button>
                <button onClick={() => handleDelete("work", job.id)} className={styles.timelineActionBtn}>Delete</button>
              </div>
            )}
          </div>
        ))}

        {editingSection === "work" && (
          <div className={styles.editForm}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder="Company name"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Position</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  placeholder="Job title"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="City, Country"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Start Date</label>
                <DatePicker
                  value={formData.start_date}
                  onChange={(value) => setFormData({...formData, start_date: value})}
                  placeholder="Select start date"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>End Date</label>
                <DatePicker
                  value={formData.end_date}
                  onChange={(value) => setFormData({...formData, end_date: value})}
                  placeholder="Select end date"
                  disabled={formData.is_current}
                />
              </div>
              
              <div className={styles.checkboxGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_current}
                    onChange={(e) => setFormData({...formData, is_current: e.target.checked})}
                  />
                  Currently working here
                </label>
              </div>
              
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  placeholder="Describe your role and responsibilities..."
                />
              </div>
            </div>
            
            <div className={styles.formActions}>
              <button onClick={handleSave} className={styles.saveBtn}>Save</button>
              <button onClick={() => setEditingSection(null)} className={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        )}

        {!editingSection && isOwner && (
          <button onClick={() => handleEdit("work")} className={styles.addNewBtn}>
            <span className={styles.addNewIcon}>+</span>
            Add Work Experience
          </button>
        )}
      </div>
    );
  };

  // Render Facebook-style intro section for compact view
  const renderIntroSection = () => {
    if (!compact) return null;

    return (
      <>
        {/* Profile Lock Section */}
        <div className={styles.profileLock}>
          <span className={styles.profileLockIcon}>🔒</span>
          <span className={styles.profileLockText}>You locked your profile</span>
          <a href="#" className={styles.profileLockLink}>Learn more</a>
        </div>

        {/* Intro Section */}
        <div className={`${styles.introSection} ${mobile ? styles.mobile : ''}`}>
          <h3 className={styles.introTitle}>Intro</h3>
          <div className={styles.introItems}>
            {profile?.bio && (
              <div className={styles.introItem}>
                <span className={styles.introIcon}>💬</span>
                <span className={styles.introText}>{profile.bio}</span>
              </div>
            )}
            {profile?.location && (
              <div className={styles.introItem}>
                <span className={styles.introIcon}>🏠</span>
                <span className={styles.introText}>Lives in <strong>{profile.location}</strong></span>
              </div>
            )}
            {profile?.hometown && (
              <div className={styles.introItem}>
                <span className={styles.introIcon}>📍</span>
                <span className={styles.introText}>From <strong>{profile.hometown}</strong></span>
              </div>
            )}
            {profile?.relationship_status && (
              <div className={styles.introItem}>
                <span className={styles.introIcon}>❤️</span>
                <span className={styles.introText}>{profile.relationship_status}</span>
              </div>
            )}
            {profile?.birthday && (
              <div className={styles.introItem}>
                <span className={styles.introIcon}>🎂</span>
                <span className={styles.introText}>Born {profile.birthday}</span>
              </div>
            )}
            {profile?.gender && (
              <div className={styles.introItem}>
                <span className={styles.introIcon}>👤</span>
                <span className={styles.introText}>{profile.gender}</span>
              </div>
            )}
            {profile?.phone && (
              <div className={styles.introItem}>
                <span className={styles.introIcon}>📱</span>
                <span className={styles.introText}>{profile.phone}</span>
              </div>
            )}
            {profile?.email_public && (
              <div className={styles.introItem}>
                <span className={styles.introIcon}>📧</span>
                <span className={styles.introText}>{profile.email_public}</span>
              </div>
            )}
            {profile?.website && (
              <div className={styles.introItem}>
                <span className={styles.introIcon}>🌐</span>
                <span className={styles.introText}>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    {profile.website}
                  </a>
                </span>
              </div>
            )}
            {profile?.created_at && (
              <div className={styles.introItem}>
                <span className={styles.introIcon}>⏰</span>
                <span className={styles.introText}>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            )}
          </div>
          {isOwner && (
            <button className={styles.editBioBtn}>
              Edit bio
            </button>
          )}
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading about information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <button onClick={fetchAboutData} className={styles.retryBtn}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.aboutContainer} ${compact ? styles.compact : ''} ${mobile ? styles.mobile : ''}`}>
      {renderIntroSection()}
      {renderBasicInfo()}
      {renderEducation()}
      {renderWork()}
    </div>
  );
}
