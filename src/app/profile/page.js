"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession } from "../../../lib/supabaseCLient";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    async function redirectToUserProfile() {
      const session = await getCurrentSession();
      if (session?.user) {
        // Get user's profile to get their username
        try {
          const response = await fetch(`/api/profile/${session.user.id}`);
          const data = await response.json();
          
          if (data.success && data.profile?.username) {
            router.replace(`/profile/${data.profile.username}`);
          } else {
            // If no username, redirect to edit profile
            router.replace('/profile/edit');
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          router.replace('/profile/edit');
        }
      } else {
        router.replace('/login');
      }
    }
    
    redirectToUserProfile();
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '50vh',
      fontSize: '1.1rem',
      color: '#666'
    }}>
      Redirecting to your profile...
    </div>
  );
} 