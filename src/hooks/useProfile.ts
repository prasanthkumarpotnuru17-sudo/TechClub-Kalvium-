import { useAuthContext } from "@/context/AuthContext";
import { UserProfile } from "@/types/profile";
import { ParticipantType } from "@/types/auth";

export function useProfile() {
  const { profile, user, updateParticipantType, updateProfileData } = useAuthContext();

  return {
    profile,
    participantType: user?.participantType || null,
    profileCompletion: user?.profileCompletion || 0,
    requiredFieldsCompleted: user?.requiredFieldsCompleted || false,
    updateParticipantType,
    updateProfileData: (data: Partial<UserProfile>) => updateProfileData(data),
  };
}
