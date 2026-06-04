import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppBar from "../components/AppBar";
import { useTournament } from "../context/TournamentContext";
import Colors from "../theme/Colors";
import { parseJwt } from "../utils/parseJwt";
import { showToast } from "../utils/Toast";

const BASE_URL = process.env.EXPO_PUBLIC_API;

interface TeamConfig {
  team_config_id: string;
  config_name: string;
  min_team_size: string;
  max_team_size: string;
}

interface TeamMemberForm {
  player_name: string;
  phone: string;
  gender: string;
  dob: Date | null;
  gamer_tag: string;
  email: string;
  photoUri: string | null;
  looked_up_player_id: string | null;
  looked_up_profile_updated: boolean;
  lookup_loading: boolean;
  lookup_done: boolean;
}

const GENDER_OPTIONS = ["Male", "Female", "Other"];

// ─── Small reusable pieces ───────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      <View style={styles.sectionHeaderLine} />
    </View>
  );
}

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
  maxLength,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: any;
  editable?: boolean;
  maxLength?: number;
}) {
  return (
    <TextInput
      style={[styles.input, !editable && styles.inputDisabled]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#aaa"
      keyboardType={keyboardType}
      editable={editable}
      maxLength={maxLength}
    />
  );
}

function GenderSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (g: string) => void;
}) {
  return (
    <View style={styles.genderRow}>
      {GENDER_OPTIONS.map((g) => (
        <TouchableOpacity
          key={g}
          style={[styles.genderChip, value === g && styles.genderChipActive]}
          onPress={() => onChange(g)}
        >
          <Text
            style={[
              styles.genderChipText,
              value === g && styles.genderChipTextActive,
            ]}
          >
            {g}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function DOBPicker({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
}) {
  const [show, setShow] = useState(false);

  const display = value
    ? value.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Select date of birth";

  return (
    <>
      <TouchableOpacity style={styles.dobButton} onPress={() => setShow(true)}>
        <Text style={[styles.dobButtonText, !value && styles.dobPlaceholder]}>
          {display}
        </Text>
        <Text style={styles.dobIcon}>📅</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value || new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={(_, selected) => {
            setShow(Platform.OS === "ios");
            if (selected) onChange(selected);
            if (Platform.OS !== "ios") setShow(false);
          }}
        />
      )}
    </>
  );
}

// ─── Team member card ────────────────────────────────────────────────────────

function TeamMemberCard({
  index,
  member,
  onChange,
  onRemove,
  canRemove,
  onCameraPress,
  buyerOptedOut,
  buyerPhone,
  buyerEmail,
  onLookup,
}: {
  index: number;
  member: TeamMemberForm;
  onChange: (field: keyof TeamMemberForm, value: any) => void;
  onRemove: () => void;
  canRemove: boolean;
  onCameraPress: () => void;
  buyerOptedOut: boolean;
  buyerPhone: string;
  buyerEmail: string;
  onLookup: () => void;
}) {
  const isLocked =
    member.looked_up_player_id !== null && member.looked_up_profile_updated;
  const isFound = member.lookup_done && member.looked_up_player_id !== null;
  const isNotFound = member.lookup_done && member.looked_up_player_id === null;

  return (
    <View style={styles.memberCard}>
      <View style={styles.memberCardHeader}>
        <Text style={styles.memberCardTitle}>
          {buyerOptedOut
            ? index === 0
              ? "Player 1 (Team Leader)"
              : `Player ${index + 1}`
            : `Player ${index + 2}`}
        </Text>
        {canRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Phone — always first, with lookup button */}
      <FieldLabel label="Phone" required />
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <StyledInput
            value={member.phone}
            onChangeText={(t) => {
              const cleaned = t.replace(/[^0-9]/g, "").slice(0, 10);
              // Block buyer phone when opted out
              if (buyerOptedOut && cleaned === buyerPhone) return;
              onChange("phone", cleaned);
              // Reset lookup state when phone changes
              if (member.lookup_done) {
                onChange("lookup_done", false);
                onChange("looked_up_player_id", null);
                onChange("looked_up_profile_updated", false);
              }
            }}
            placeholder="10-digit mobile number"
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
        <TouchableOpacity
          style={[
            {
              paddingHorizontal: 12,
              paddingVertical: 11,
              borderRadius: 8,
              borderWidth: 1,
              alignItems: "center",
              justifyContent: "center",
              minWidth: 80,
            },
            isFound
              ? { backgroundColor: "#e8f5e9", borderColor: "#2d7a2d" }
              : { backgroundColor: "#f0f0f0", borderColor: "#ddd" },
            (member.phone.length < 10 || member.lookup_loading) && {
              opacity: 0.5,
            },
          ]}
          onPress={onLookup}
          disabled={
            member.phone.length < 10 || member.lookup_loading || isFound
          }
        >
          {member.lookup_loading ? (
            <ActivityIndicator size="small" color="#2d7a2d" />
          ) : (
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Roboto-SemiBold",
                color: isFound ? "#2d7a2d" : "#555",
              }}
            >
              {isFound ? "Found ✓" : "Check"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Buyer phone conflict warning */}
      {buyerOptedOut && member.phone === buyerPhone && (
        <Text
          style={{
            fontSize: 12,
            color: "#c62828",
            fontFamily: "Roboto-Regular",
            marginTop: 4,
          }}
        >
          Buyer's phone cannot be used for team members.
        </Text>
      )}

      {/* Not found notice */}
      {isNotFound && (
        <View
          style={{
            backgroundColor: "#fff3e0",
            borderRadius: 6,
            padding: 8,
            marginTop: 6,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: "#e65100",
              fontFamily: "Roboto-Regular",
            }}
          >
            No existing player found. Fill details manually.
          </Text>
        </View>
      )}

      {/* Photo */}
      <PhotoCapture
        uri={member.photoUri}
        label="Member Photo"
        onPress={isLocked ? () => {} : onCameraPress}
      />
      {isLocked && (
        <Text
          style={{
            fontSize: 11,
            color: "#888",
            fontFamily: "Roboto-Regular",
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          Photo from existing record
        </Text>
      )}

      <FieldLabel label="Name" required />
      <StyledInput
        value={member.player_name}
        onChangeText={(t) => onChange("player_name", t)}
        placeholder="Full name"
        editable={!isLocked}
      />

      <FieldLabel label="Gamer Tag" />
      <StyledInput
        value={member.gamer_tag}
        onChangeText={(t) => onChange("gamer_tag", t)}
        placeholder="In-game name"
        editable={!isLocked}
      />

      <FieldLabel label="Gender" required />
      {isLocked ? (
        <StyledInput
          value={member.gender}
          onChangeText={() => {}}
          placeholder="Gender"
          editable={false}
        />
      ) : (
        <GenderSelector
          value={member.gender}
          onChange={(g) => onChange("gender", g)}
        />
      )}

      <FieldLabel label="Date of Birth" required />
      {isLocked ? (
        <StyledInput
          value={
            member.dob
              ? member.dob.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "Not set"
          }
          onChangeText={() => {}}
          placeholder="Date of birth"
          editable={false}
        />
      ) : (
        <DOBPicker value={member.dob} onChange={(d) => onChange("dob", d)} />
      )}

      <FieldLabel label="Email" required />
      <StyledInput
        value={member.email}
        onChangeText={(t) => {
          if (
            buyerOptedOut &&
            t.trim().toLowerCase() === buyerEmail.trim().toLowerCase()
          )
            return;
          onChange("email", t);
        }}
        placeholder="Email"
        keyboardType="email-address"
        editable={!isLocked}
      />
    </View>
  );
}

function PhotoCapture({
  uri,
  label,
  onPress,
}: {
  uri: string | null;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={pcStyles.wrap} onPress={onPress}>
      {uri ? (
        <RNImage source={{ uri }} style={pcStyles.img} />
      ) : (
        <View style={pcStyles.empty}>
          <Text style={pcStyles.icon}>📷</Text>
          <Text style={pcStyles.label}>{label}</Text>
        </View>
      )}
      <View style={pcStyles.overlay}>
        <Text style={pcStyles.overlayText}>
          {uri ? "Retake" : "Take Photo"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const pcStyles = StyleSheet.create({
  wrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    overflow: "hidden",
    alignSelf: "center",
    marginBottom: 10,
  },
  img: { width: "100%", height: "100%" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  icon: { fontSize: 24 },
  label: {
    fontSize: 10,
    fontFamily: "Roboto-Regular",
    color: "#888",
    textAlign: "center",
    marginTop: 2,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 3,
    alignItems: "center",
  },
  overlayText: { fontSize: 9, fontFamily: "Roboto-SemiBold", color: "#fff" },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function VenueRegistrationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone: string;
    ticket_id: string;
    tournament_id: string;
    is_team_ticket?: string;
    team_name?: string;
    player_id?: string;
    player_name?: string;
    player_gender?: string;
    player_dob?: string;
    player_email?: string;
    player_gamer_tag?: string;
    player_photo?: string;
    profile_updated?: string;
  }>();

  const sp = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : (v ?? "");

  const existingPlayerId = sp(params.player_id);
  const existingName = sp(params.player_name);
  const existingGender = sp(params.player_gender);
  const existingDobUnix = sp(params.player_dob); // unix string
  const existingEmail = sp(params.player_email);
  const existingGamerTag = sp(params.player_gamer_tag);
  const existingPhoto = sp(params.player_photo);
  const profileUpdated = sp(params.profile_updated) === "true";
  const { staffInfo } = useTournament();
  const [leaderPhotoBase64, setLeaderPhotoBase64] = useState<string | null>(
    null,
  );
  const [teamPhotoBase64, setTeamPhotoBase64] = useState<string | null>(null);
  const [leaderName, setLeaderName] = useState(existingName);
  const [leaderEmail, setLeaderEmail] = useState(existingEmail);
  const [leaderGamerTag, setLeaderGamerTag] = useState(existingGamerTag);
  const [leaderGender, setLeaderGender] = useState(existingGender);
  const [leaderPassword, setLeaderPassword] = useState("");
  const [leaderDOB, setLeaderDOB] = useState<Date | null>(() => {
    if (existingDobUnix) return new Date(parseInt(existingDobUnix) * 1000);
    return null;
  });
  const EXPO_PUBLIC_PHOTO_BASE_URL = process.env.EXPO_PUBLIC_CF_DOMAIN;
  const [leaderPhotoUri, setLeaderPhotoUri] = useState<string | null>(
    existingPhoto ? `${EXPO_PUBLIC_PHOTO_BASE_URL}/${existingPhoto}` : null,
  );

  const [teamConfigs, setTeamConfigs] = useState<TeamConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<TeamConfig | null>(null);
  const [showConfigPicker, setShowConfigPicker] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [buyerOptedOut, setBuyerOptedOut] = useState(false);

  const [teamPhotoUri, setTeamPhotoUri] = useState<string | null>(null);

  const openCamera = async (onCapture: (uri: string) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Camera permission is required to take photos.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      onCapture(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (
    uri: string,
    email: string,
    password: string,
  ): Promise<void> => {
    try {
      const loginRes = await fetch(`${BASE_URL}/api/player/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });
      if (!loginRes.ok) return;
      const { access_token } = await loginRes.json();
      if (!access_token) return;

      const form = new FormData();
      form.append("photo", {
        uri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as any);
      await fetch(`${BASE_URL}/api/player/upload-photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}` },
        body: form,
      });
    } catch {
      // non-fatal
    }
  };

  const phone = Array.isArray(params.phone) ? params.phone[0] : params.phone;
  const ticketId = Array.isArray(params.ticket_id)
    ? params.ticket_id[0]
    : params.ticket_id;
  const tournamentId = Array.isArray(params.tournament_id)
    ? params.tournament_id[0]
    : params.tournament_id;
  const isTeamTicketParam = Array.isArray(params.is_team_ticket)
    ? params.is_team_ticket[0]
    : params.is_team_ticket;
  const prefilledTeamName = Array.isArray(params.team_name)
    ? params.team_name[0]
    : params.team_name;
  const isTeamTicket = isTeamTicketParam === "true";
  const [teamNameInput, setTeamNameInput] = useState(prefilledTeamName || "");

  const [teamPhoto, setTeamPhoto] = useState<string | null>(null);
  // ── Fetch team configs ──────────────────────────────────────────────────

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/team-configs`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setTeamConfigs(Array.isArray(data) ? data : []);
      } catch {
        showToast("Could not load team configurations");
      } finally {
        setConfigsLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (!selectedConfig) return;
    const minSize = parseInt(selectedConfig.min_team_size) || 1;
    const membersNeeded = Math.max(0, buyerOptedOut ? minSize : minSize - 1);
    setTeamMembers(
      Array.from({ length: membersNeeded }, () => ({
        player_name: "",
        phone: "",
        gender: "",
        dob: null,
        gamer_tag: "",
        email: "",
        photoUri: null,
        looked_up_player_id: null,
        looked_up_profile_updated: false,
        lookup_loading: false,
        lookup_done: false,
      })),
    );
  }, [buyerOptedOut]);

  // ── Team config selection ───────────────────────────────────────────────

  const handleSelectConfig = (config: TeamConfig) => {
    setSelectedConfig(config);
    setShowConfigPicker(false);

    const minSize = parseInt(config.min_team_size) || 1;
    // When buyer opts out, all slots are new people (no -1)
    // When buyer is playing, buyer fills slot 1 so members = minSize - 1
    const membersNeeded = Math.max(0, buyerOptedOut ? minSize : minSize - 1);
    const newMembers: TeamMemberForm[] = Array.from(
      { length: membersNeeded },
      () => ({
        player_name: "",
        phone: "",
        gender: "",
        dob: null,
        gamer_tag: "",
        email: "",
        photoUri: null,
        looked_up_player_id: null,
        looked_up_profile_updated: false,
        lookup_loading: false,
        lookup_done: false,
      }),
    );
    setTeamMembers(newMembers);
  };

  const maxMembers = selectedConfig
    ? buyerOptedOut
      ? parseInt(selectedConfig.max_team_size)
      : parseInt(selectedConfig.max_team_size) - 1
    : 0;
  const minMembers = selectedConfig
    ? buyerOptedOut
      ? parseInt(selectedConfig.min_team_size)
      : parseInt(selectedConfig.min_team_size) - 1
    : 0;

  const addMember = () => {
    if (teamMembers.length >= maxMembers) return;
    setTeamMembers((prev) => [
      ...prev,
      {
        player_name: "",
        phone: "",
        gender: "",
        dob: null,
        gamer_tag: "",
        email: "",
        photoUri: null,
        looked_up_player_id: null,
        looked_up_profile_updated: false,
        lookup_loading: false,
        lookup_done: false,
      },
    ]);
  };

  const removeMember = (index: number) => {
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMember = (
    index: number,
    field: keyof TeamMemberForm,
    value: any,
  ) => {
    setTeamMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  };

  // ── Validation ──────────────────────────────────────────────────────────

  const validate = (): string | null => {
    const isTeamFlow =
      isTeamTicket ||
      (selectedConfig &&
        !(
          parseInt(selectedConfig.min_team_size) === 1 &&
          parseInt(selectedConfig.max_team_size) === 1
        ));
    if (isTeamFlow && !teamNameInput.trim()) return "Team name is required";
    if (isTeamFlow && !teamPhotoUri) return "Team photo is required";

    if (!buyerOptedOut) {
      if (!leaderName.trim()) return "Leader name is required";
      if (!leaderGender) return "Leader gender is required";
      if (!leaderDOB) return "Leader date of birth is required";
      if (!existingPlayerId && !leaderPassword.trim())
        return "Password is required";
    } else {
      if (teamMembers.length === 0)
        return "Add at least one player when buyer opts out";
      if (!teamMembers[0].player_name.trim())
        return "First member name is required";
      if (!teamMembers[0].phone || teamMembers[0].phone.length !== 10)
        return "First member valid phone is required";
    }

    if (selectedConfig) {
      if (teamMembers.length < minMembers)
        return `Minimum ${minMembers} team member(s) required`;

      for (let i = 0; i < teamMembers.length; i++) {
        const m = teamMembers[i];
        if (!m.player_name.trim()) return `Member ${i + 1}: name is required`;
        if (!m.phone || m.phone.length !== 10)
          return `Member ${i + 1}: valid 10-digit phone is required`;
        if (!m.gender) return `Member ${i + 1}: gender is required`;
        if (!m.dob) return `Member ${i + 1}: date of birth is required`;
      }
    }

    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      Alert.alert("Validation Error", error);
      return;
    }

    const token = await AsyncStorage.getItem("staff_token");
    const payload = token ? parseJwt(token) : null;
    const receptionistId = payload?.staff_id || staffInfo?.staff_id;
    if (!receptionistId) {
      Alert.alert("Error", "Could not identify receptionist. Please re-login.");
      return;
    }

    setLoading(true);
    try {
      // ── Step 1: Resolve leader ───────────────────────────────────────────
      let leaderId = buyerOptedOut ? null : existingPlayerId;
      const allPlayerIds: string[] = [leaderId!];

      if (leaderId) {
        // Player exists — update tournament link
        await fetch(`${BASE_URL}/api/player/update-tournament`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            player_id: leaderId,
            tournament_id: tournamentId,
            ticket_id: ticketId,
          }),
        });

        // Patch profile only if not yet updated
        if (!profileUpdated) {
          try {
            const loginRes = await fetch(`${BASE_URL}/api/player/login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: existingEmail || leaderEmail.trim(),
                password: phone,
              }),
            });
            console.log(
              "Profile patch login status:",
              loginRes.status,
              "email:",
              existingEmail || leaderEmail.trim(),
            );
            if (loginRes.ok) {
              const { access_token } = await loginRes.json();
              if (access_token) {
                const patchBody: any = { profile_updated: true };
                if (leaderName.trim()) patchBody.playerName = leaderName.trim();
                patchBody.gamerTag = leaderGamerTag.trim() || leaderName.trim();
                if (leaderEmail.trim()) patchBody.email = leaderEmail.trim();
                const genderToSave = buyerOptedOut
                  ? teamMembers[0]?.gender
                  : leaderGender;
                if (genderToSave) patchBody.gender = genderToSave;
                const dobToSave = buyerOptedOut
                  ? teamMembers[0]?.dob
                  : leaderDOB;
                if (dobToSave)
                  patchBody.dob = Math.floor(dobToSave.getTime() / 1000);
                console.log("Patching profile:", JSON.stringify(patchBody));
                const patchRes = await fetch(
                  `${BASE_URL}/api/player/update-profile/${leaderId}`,
                  {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${access_token}`,
                    },
                    body: JSON.stringify(patchBody),
                  },
                );
                console.log("Patch response status:", patchRes.status);
              }
            }
          } catch (e) {
            console.error("Profile patch error:", e);
          }
        }

        // Upload photo if taken
        if (leaderPhotoUri && !existingPhoto) {
          await uploadPhoto(
            leaderPhotoUri,
            leaderEmail || existingEmail,
            phone,
          );
        }
      } else {
        // ── Create new leader player ───────────────────────────────────────
        const leaderData = buyerOptedOut ? teamMembers[0] : null;
        const nameToUse = buyerOptedOut
          ? leaderData!.player_name.trim()
          : leaderName.trim();
        const emailToUse = buyerOptedOut
          ? leaderData!.email.trim() || `${leaderData!.phone}@venue.teho`
          : leaderEmail.trim() || `${phone}@venue.teho`;
        const genderToUse = buyerOptedOut ? leaderData!.gender : leaderGender;
        const dobToUse = buyerOptedOut
          ? leaderData!.dob
            ? Math.floor(leaderData!.dob.getTime() / 1000)
            : 0
          : leaderDOB
            ? Math.floor(leaderDOB.getTime() / 1000)
            : 0;
        const phoneToUse = buyerOptedOut ? leaderData!.phone : phone;
        const gamerTagToUse = buyerOptedOut
          ? leaderData!.gamer_tag.trim() || nameToUse
          : leaderGamerTag.trim() || nameToUse;
        const photoUriToUse = buyerOptedOut
          ? leaderData!.photoUri
          : leaderPhotoUri;

        const createRes = await fetch(`${BASE_URL}/api/player/signup/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerName: nameToUse,
            gamerTag: gamerTagToUse,
            email: emailToUse,
            phoneNo: phoneToUse,
            password: phoneToUse,
            gender: genderToUse,
            dob: dobToUse,
            tournamentID: tournamentId,
            listOfOurTicketIDs: [ticketId],
            profile_updated: true,
          }),
        });

        if (!createRes.ok) {
          // May already exist — try lookup
          const lookupRes = await fetch(
            `${BASE_URL}/api/player/{player_id}?player_id_or_phone=${phoneToUse}`,
          );
          if (lookupRes.ok) {
            const d = await lookupRes.json();
            leaderId = d.player_id;
            await fetch(`${BASE_URL}/api/player/update-tournament`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                player_id: leaderId,
                tournament_id: tournamentId,
                ticket_id: ticketId,
              }),
            });
          } else {
            const err = await createRes.json().catch(() => ({}));
            Alert.alert(
              "Registration Failed",
              err.detail || "Could not create player.",
            );
            return;
          }
        } else {
          const d = await createRes.json();
          leaderId = d.player_id || d.custom_id;
        }

        // Upload leader photo
        if (photoUriToUse && leaderId) {
          await uploadPhoto(photoUriToUse, emailToUse, phoneToUse);
        }
      }

      // ── Step 2: Create / resolve team members ────────────────────────────
      const membersList = buyerOptedOut ? teamMembers.slice(1) : teamMembers;

      // When buyer opted out, teamMembers[0] is the team leader
      if (buyerOptedOut && teamMembers.length > 0) {
        const leaderData = teamMembers[0];
        if (leaderData.looked_up_player_id) {
          // Already has a player record — link and optionally patch
          const lEmail =
            leaderData.email.trim() || `${leaderData.phone}@venue.teho`;
          await fetch(`${BASE_URL}/api/player/update-tournament`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              player_id: leaderData.looked_up_player_id,
              tournament_id: tournamentId,
              ticket_id: ticketId,
            }),
          }).catch(() => {});

          if (!leaderData.looked_up_profile_updated) {
            // Patch profile
            try {
              const loginRes = await fetch(`${BASE_URL}/api/player/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  username: lEmail,
                  password: leaderData.phone,
                }),
              });
              if (loginRes.ok) {
                const { access_token } = await loginRes.json();
                if (access_token) {
                  const patchBody: any = { profile_updated: true };
                  if (leaderData.player_name.trim())
                    patchBody.playerName = leaderData.player_name.trim();
                  if (leaderData.gamer_tag.trim())
                    patchBody.gamerTag = leaderData.gamer_tag.trim();
                  if (leaderData.gender) patchBody.gender = leaderData.gender;
                  if (leaderData.dob)
                    patchBody.dob = Math.floor(leaderData.dob.getTime() / 1000);
                  await fetch(
                    `${BASE_URL}/api/player/update-profile/${leaderData.looked_up_player_id}`,
                    {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${access_token}`,
                      },
                      body: JSON.stringify(patchBody),
                    },
                  );
                }
              }
            } catch (e) {
              console.error("Leader patch error:", e);
            }
          }

          // Upload photo only if newly taken (file:// URI)
          if (
            leaderData.photoUri &&
            leaderData.photoUri.startsWith("file://")
          ) {
            await uploadPhoto(leaderData.photoUri, lEmail, leaderData.phone);
          }

          allPlayerIds[0] = leaderData.looked_up_player_id;
        }
        // If no looked_up_player_id, leaderId was already set in Step 1 via create flow
      }

      for (const m of membersList) {
        const mEmail = m.email.trim() || `${m.phone}@venue.teho`;
        const mGamerTag = m.gamer_tag.trim() || m.player_name.trim();
        const mDob = m.dob ? Math.floor(m.dob.getTime() / 1000) : 0;

        let mId: string | null = m.looked_up_player_id || null;

        if (mId) {
          // Existing player found via lookup
          await fetch(`${BASE_URL}/api/player/update-tournament`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              player_id: mId,
              tournament_id: tournamentId,
              ticket_id: ticketId,
            }),
          }).catch(() => {});

          if (!m.looked_up_profile_updated) {
            try {
              const loginRes = await fetch(`${BASE_URL}/api/player/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: mEmail, password: m.phone }),
              });
              if (loginRes.ok) {
                const { access_token } = await loginRes.json();
                if (access_token) {
                  const patchBody: any = { profile_updated: true };
                  if (m.player_name.trim())
                    patchBody.playerName = m.player_name.trim();
                  if (mGamerTag) patchBody.gamerTag = mGamerTag;
                  if (m.gender) patchBody.gender = m.gender;
                  if (mDob) patchBody.dob = mDob;
                  await fetch(`${BASE_URL}/api/player/update-profile/${mId}`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${access_token}`,
                    },
                    body: JSON.stringify(patchBody),
                  });
                }
              }
            } catch (e) {
              console.error("Member patch error:", e);
            }
          }

          if (m.photoUri && m.photoUri.startsWith("file://")) {
            await uploadPhoto(m.photoUri, mEmail, m.phone);
          }
        } else {
          // No lookup hit — try phone lookup as fallback, then create
          try {
            const lookupRes = await fetch(
              `${BASE_URL}/api/player/${encodeURIComponent(m.phone)}/?player_id_or_phone=${encodeURIComponent(m.phone)}`,
            );
            if (lookupRes.ok) {
              const d = await lookupRes.json();
              if (d.player_id) {
                mId = d.player_id;
                await fetch(`${BASE_URL}/api/player/update-tournament`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    player_id: mId,
                    tournament_id: tournamentId,
                    ticket_id: ticketId,
                  }),
                }).catch(() => {});
              }
            }
          } catch {
            /* not found */
          }

          if (!mId) {
            const createRes = await fetch(`${BASE_URL}/api/player/signup/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                playerName: m.player_name.trim(),
                gamerTag: mGamerTag,
                email: mEmail,
                phoneNo: m.phone,
                password: m.phone,
                gender: m.gender,
                dob: mDob,
                tournamentID: tournamentId,
                listOfOurTicketIDs: [ticketId],
                profile_updated: true,
              }),
            });
            if (createRes.ok) {
              const d = await createRes.json();
              mId = d.player_id || d.custom_id;
            }
          }

          if (mId && m.photoUri && m.photoUri.startsWith("file://")) {
            await uploadPhoto(m.photoUri, mEmail, m.phone);
          }
        }

        if (mId) allPlayerIds.push(mId);
      }

      // ── Step 3: Link all players to ticket ───────────────────────────────
      const isSoloConfig =
        !selectedConfig ||
        (parseInt(selectedConfig.min_team_size) === 1 &&
          parseInt(selectedConfig.max_team_size) === 1);
      const isTeam = isTeamTicket || !isSoloConfig;

      await fetch(
        `${BASE_URL}/api/our-tickets/update/${ticketId}?set_registered=true`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            list_of_players: allPlayerIds,
            team_leader: allPlayerIds[0],
            team_name: isTeam ? teamNameInput.trim() : null,
            is_team_ticket: isTeam,
          }),
        },
      );

      // ── Step 4: Upload team photo ────────────────────────────────────────
      if (isTeam && teamPhotoUri) {
        try {
          const form = new FormData();
          form.append("photo", {
            uri: teamPhotoUri,
            name: "team_photo.jpg",
            type: "image/jpeg",
          } as any);
          await fetch(
            `${BASE_URL}/api/our-activity-performances/${ticketId}/upload-team-photo`,
            { method: "POST", body: form },
          );
        } catch {
          showToast("Team photo upload failed but registration succeeded.");
        }
      }

      // ── Step 5: Mark arrived via venue registration ──────────────────────
      await fetch(`${BASE_URL}/api/ticket-approval/${ticketId}/mark-arrived`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receptionist_id: receptionistId }),
      });

      showToast("Player registered successfully!");
      router.replace({
        pathname: "/Ticketapprovalscreen",
        params: { ticket_id: ticketId },
      });
    } catch (err) {
      console.error("Venue registration error:", err);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMemberLookup = async (index: number) => {
    const member = teamMembers[index];
    if (member.phone.length !== 10) return;

    // Block buyer phone
    if (buyerOptedOut && member.phone === phone) {
      Alert.alert(
        "Not allowed",
        "Buyer's phone cannot be used for a team member.",
      );
      return;
    }

    updateMember(index, "lookup_loading", true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/player/${encodeURIComponent(member.phone)}/?player_id_or_phone=${encodeURIComponent(member.phone)}`,
      );
      const data = await res.json();

      if (!res.ok || data.statuscode === "404" || !data.player_id) {
        updateMember(index, "lookup_done", true);
        updateMember(index, "looked_up_player_id", null);
        updateMember(index, "looked_up_profile_updated", false);
        return;
      }

      // Found — pre-fill fields
      const updates: Partial<TeamMemberForm> = {
        looked_up_player_id: data.player_id,
        looked_up_profile_updated: data.profile_updated || false,
        lookup_done: true,
        lookup_loading: false,
        player_name: data.name || data.player_name || member.player_name,
        gamer_tag: data.gamer_tag || member.gamer_tag,
        email: data.email || member.email,
        gender: data.gender || member.gender,
        dob: data.dob ? new Date(data.dob * 1000) : member.dob,
        photoUri: data.photo
          ? `${process.env.EXPO_PUBLIC_CF_DOMAIN}/${data.photo}`
          : member.photoUri,
      };

      setTeamMembers((prev) =>
        prev.map((m, i) => (i === index ? { ...m, ...updates } : m)),
      );
    } catch {
      updateMember(index, "lookup_done", true);
      updateMember(index, "looked_up_player_id", null);
    } finally {
      updateMember(index, "lookup_loading", false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <AppBar
        title="Venue Registration"
        titleFontWeight="bold"
        onMenuPress={() => {}}
        logoSource={require("../assets/images/tehologo.png")}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Phone badge */}
          <View style={styles.phoneBadge}>
            <Text style={styles.phoneBadgeLabel}>Registering for</Text>
            <Text style={styles.phoneBadgeNumber}>{phone}</Text>
          </View>

          {/* ── Buyer opt-out toggle ── */}
          <View style={styles.optOutRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optOutTitle}>Buyer is playing?</Text>
              <Text style={styles.optOutSubtitle}>
                Toggle off if buyer purchased for someone else.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setBuyerOptedOut((v) => !v)}
              style={[
                styles.toggle,
                { backgroundColor: !buyerOptedOut ? "#2d7a2d" : "#ccc" },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  {
                    transform: [{ translateX: !buyerOptedOut ? 20 : 2 }],
                  },
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* ── Team name for team tickets ── */}
          {(isTeamTicket ||
            (selectedConfig &&
              !(
                parseInt(selectedConfig.min_team_size) === 1 &&
                parseInt(selectedConfig.max_team_size) === 1
              ))) && (
            <>
              <SectionHeader title="Team Details" />
              <FieldLabel label="Team Name" required />
              <StyledInput
                value={teamNameInput}
                onChangeText={setTeamNameInput}
                placeholder="Enter team name (required)"
              />
              <FieldLabel label="Team Photo" required />
              <PhotoCapture
                uri={teamPhotoUri}
                label="Team Photo"
                onPress={() => openCamera((uri) => setTeamPhotoUri(uri))}
              />
            </>
          )}

          {/* ── Team Config ── */}
          <SectionHeader title="Team Configuration" />

          {configsLoading ? (
            <ActivityIndicator
              color={Colors.accent}
              style={{ marginVertical: 12 }}
            />
          ) : teamConfigs.length === 0 ? (
            <Text style={styles.noConfigText}>
              No team configs available. Registering as solo player.
            </Text>
          ) : (
            <>
              <TouchableOpacity
                style={styles.configSelector}
                onPress={() => setShowConfigPicker((v) => !v)}
              >
                <Text style={styles.configSelectorText}>
                  {selectedConfig
                    ? `${selectedConfig.config_name} (${selectedConfig.min_team_size}–${selectedConfig.max_team_size} players)`
                    : "Select a team configuration"}
                </Text>
                <Text style={styles.configChevron}>
                  {showConfigPicker ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {showConfigPicker && (
                <View style={styles.configDropdown}>
                  <TouchableOpacity
                    style={styles.configOption}
                    onPress={() => {
                      setSelectedConfig(null);
                      setTeamMembers([]);
                      setShowConfigPicker(false);
                    }}
                  >
                    <Text style={styles.configOptionText}>
                      No team (solo player)
                    </Text>
                  </TouchableOpacity>
                  {teamConfigs.map((c) => (
                    <TouchableOpacity
                      key={c.team_config_id}
                      style={[
                        styles.configOption,
                        selectedConfig?.team_config_id === c.team_config_id &&
                          styles.configOptionActive,
                      ]}
                      onPress={() => handleSelectConfig(c)}
                    >
                      <Text
                        style={[
                          styles.configOptionText,
                          selectedConfig?.team_config_id === c.team_config_id &&
                            styles.configOptionTextActive,
                        ]}
                      >
                        {c.config_name}
                      </Text>
                      <Text style={styles.configOptionSub}>
                        {c.min_team_size}–{c.max_team_size} players
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {/* ── Group Leader ── */}
          <SectionHeader
            title={buyerOptedOut ? "Buyer (Not Playing)" : "Group Leader"}
          />

          {/* Leader photo — only shown when buyer is playing */}
          {!buyerOptedOut && (
            <PhotoCapture
              uri={leaderPhotoUri}
              label="Player Photo"
              onPress={() => openCamera((uri) => setLeaderPhotoUri(uri))}
            />
          )}

          <FieldLabel label="Full Name" required />
          <StyledInput
            value={leaderName}
            onChangeText={setLeaderName}
            placeholder="Leader's full name"
            editable={!profileUpdated}
          />

          <FieldLabel label="Phone" />
          <StyledInput
            value={phone}
            onChangeText={() => {}}
            placeholder=""
            editable={false}
          />

          <FieldLabel label="Gamer Tag" />
          <StyledInput
            value={leaderGamerTag}
            onChangeText={setLeaderGamerTag}
            placeholder="In-game name"
            editable={!profileUpdated}
          />

          <FieldLabel label="Email" />
          <StyledInput
            value={leaderEmail}
            onChangeText={setLeaderEmail}
            placeholder="Email"
            keyboardType="email-address"
            editable={!profileUpdated}
          />

          <FieldLabel label="Gender" required />
          {profileUpdated ? (
            <StyledInput
              value={leaderGender}
              onChangeText={() => {}}
              placeholder="Gender"
              editable={false}
            />
          ) : (
            <GenderSelector value={leaderGender} onChange={setLeaderGender} />
          )}

          <FieldLabel label="Date of Birth" required />
          {profileUpdated ? (
            <StyledInput
              value={
                leaderDOB
                  ? leaderDOB.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Not set"
              }
              onChangeText={() => {}}
              placeholder="Date of birth"
              editable={false}
            />
          ) : (
            <DOBPicker value={leaderDOB} onChange={setLeaderDOB} />
          )}

          {/* Password only for new players */}
          {!existingPlayerId && (
            <>
              <FieldLabel label="Password" required />
              <StyledInput
                value={leaderPassword}
                onChangeText={setLeaderPassword}
                placeholder="Set a login password"
              />
            </>
          )}

          {/* ── Team Members ── */}
          {selectedConfig && (
            <>
              <SectionHeader
                title={`Team Members (${teamMembers.length}/${maxMembers})`}
              />

              {teamMembers.map((member, idx) => (
                <TeamMemberCard
                  key={idx}
                  index={idx}
                  member={member}
                  onChange={(field, val) => updateMember(idx, field, val)}
                  onRemove={() => removeMember(idx)}
                  canRemove={teamMembers.length > minMembers}
                  onCameraPress={() =>
                    openCamera((uri) => updateMember(idx, "photoUri", uri))
                  }
                  buyerOptedOut={buyerOptedOut}
                  buyerPhone={phone}
                  buyerEmail={existingEmail}
                  onLookup={() => handleMemberLookup(idx)}
                />
              ))}

              {teamMembers.length < maxMembers && (
                <TouchableOpacity
                  style={styles.addMemberButton}
                  onPress={addMember}
                >
                  <Text style={styles.addMemberButtonText}>
                    + Add Team Member
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Register & Continue</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Phone badge
  phoneBadge: {
    backgroundColor: "#f0faf0",
    borderWidth: 1,
    borderColor: "#c3e6c3",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  phoneBadgeLabel: {
    fontSize: 13,
    color: "#666",
    fontFamily: "Roboto-Regular",
  },
  phoneBadgeNumber: {
    fontSize: 16,
    fontFamily: "Roboto-SemiBold",
    color: "#2d7a2d",
  },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
    gap: 10,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontFamily: "Roboto-SemiBold",
    color: "#888",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e8e8e8",
  },

  // Fields
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Roboto-Medium",
    color: "#333",
    marginBottom: 6,
    marginTop: 12,
  },
  required: {
    color: "#e53935",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "Roboto-Regular",
    color: "#222",
    backgroundColor: "#fafafa",
  },
  inputDisabled: {
    backgroundColor: "#f0f0f0",
    color: "#888",
  },

  // Gender
  genderRow: {
    flexDirection: "row",
    gap: 10,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  genderChipActive: {
    backgroundColor: "#2d7a2d",
    borderColor: "#2d7a2d",
  },
  genderChipText: {
    fontSize: 14,
    fontFamily: "Roboto-Medium",
    color: "#555",
  },
  genderChipTextActive: {
    color: "#fff",
  },

  // DOB
  dobButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#fafafa",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dobButtonText: {
    fontSize: 15,
    fontFamily: "Roboto-Regular",
    color: "#222",
  },
  dobPlaceholder: {
    color: "#aaa",
  },
  dobIcon: {
    fontSize: 16,
  },

  // Team config
  noConfigText: {
    fontSize: 14,
    fontFamily: "Roboto-Regular",
    color: "#888",
    fontStyle: "italic",
    marginBottom: 8,
  },
  configSelector: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  configSelectorText: {
    fontSize: 14,
    fontFamily: "Roboto-Regular",
    color: "#333",
    flex: 1,
  },
  configChevron: {
    fontSize: 12,
    color: "#888",
    marginLeft: 8,
  },
  configDropdown: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  configOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  configOptionActive: {
    backgroundColor: "#f0faf0",
  },
  configOptionText: {
    fontSize: 14,
    fontFamily: "Roboto-Medium",
    color: "#333",
  },
  configOptionTextActive: {
    color: "#2d7a2d",
  },
  configOptionSub: {
    fontSize: 12,
    fontFamily: "Roboto-Regular",
    color: "#888",
    marginTop: 2,
  },

  // Member card
  memberCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ebebeb",
  },
  memberCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  memberCardTitle: {
    fontSize: 15,
    fontFamily: "Roboto-SemiBold",
    color: "#333",
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#fdecea",
    borderRadius: 6,
  },
  removeButtonText: {
    fontSize: 13,
    fontFamily: "Roboto-Medium",
    color: "#c62828",
  },

  // Add member
  addMemberButton: {
    borderWidth: 1.5,
    borderColor: "#2d7a2d",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  addMemberButtonText: {
    fontSize: 15,
    fontFamily: "Roboto-SemiBold",
    color: "#2d7a2d",
  },

  // Opt-out toggle
  optOutRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  optOutTitle: {
    fontSize: 14,
    fontFamily: "Roboto-SemiBold",
    color: "#333",
  },
  optOutSubtitle: {
    fontSize: 12,
    fontFamily: "Roboto-Regular",
    color: "#888",
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    padding: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },

  // Submit
  submitButton: {
    backgroundColor: "#2d7a2d",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: "#9cba9c",
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Roboto-SemiBold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  photoCapture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    overflow: "hidden",
    alignSelf: "center",
    marginBottom: 12,
  },
  photoCaptureImage: {
    width: "100%",
    height: "100%",
  },
  photoCaptureEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  photoCaptureIcon: {
    fontSize: 28,
  },
  photoCaptureLabel: {
    fontSize: 11,
    fontFamily: "Roboto-Regular",
    color: "#888",
    textAlign: "center",
    marginTop: 4,
  },
  photoCaptureOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 3,
    alignItems: "center",
  },
  photoCaptureOverlayText: {
    fontSize: 10,
    fontFamily: "Roboto-SemiBold",
    color: "#fff",
  },
});
