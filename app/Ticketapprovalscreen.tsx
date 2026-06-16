import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamPlayerInfo {
  player_id: string;
  player_name: string | null;
  gender: string | null;
  dob: number | null;
  age: number | null;
}

interface TicketState {
  ticket_id: string;
  ticket_status: string;
  status_history: StatusEntry[];
  bought_by: string;
  booking_amount: number;
  discount_snapshot: any;
  recalculated_amount: number | null;
  recalculated_snapshot: any;
  extra_collected: number | null;
  coupon_id: string | null;
  receptionist_bucket_discount: number | null;
  kyc_corrected: boolean;
  kyc_correction_log_id: string | null;
  order_id: string | null;
  instance_ids: string[];
  performance_ids: string[];
  player_registered: boolean;
  player: PlayerInfo | null;
  team_players: TeamPlayerInfo[];
  per_ticket_entry: {
    ticket_id: string;
    package_id: string;
    base_price: number;
    discount_share: number;
    final_price: number;
  } | null;
  audit_log: AuditEntry[];
  mismatch_type?: string;
  menu_package_id?: string;
  mismatch_types: string[];
  extra_collected_total: number | null;
  extra_pending: number | null;
  benefit_issued_total: number | null;
  benefit_pending: number | null;
  bucket_discount_total: number | null;
}

interface StatusEntry {
  status: string;
  timestamp: number;
  receptionist_id: string | null;
  notes: string | null;
}

interface PlayerInfo {
  player_id: string | null;
  player_name: string | null;
  gender: string | null;
  dob: number | null;
  phone_no: string | null;
}

interface AuditEntry {
  log_id: string;
  action: string;
  timestamp: number;
  receptionist_id: string | null;
  previous_status: string;
  new_status: string;
  mismatch_type: string | null;
  kyc_changes: any;
  original_amount: number | null;
  recalculated_amount: number | null;
  extra_collected: number | null;
  bucket_applied: number | null;
  coupon_id: string | null;
  notes: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tsToString(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dobToString(dob: number | null | undefined): string {
  if (!dob) return "Not set";
  return new Date(dob * 1000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: string): {
  label: string;
  bg: string;
  text: string;
} {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    purchased: { label: "Purchased", bg: "#fff3e0", text: "#e65100" },
    arrived: { label: "Arrived", bg: "#e3f2fd", text: "#1565c0" },
    kyc_verified: { label: "KYC Verified", bg: "#e8f5e9", text: "#2e7d32" },
    kyc_mismatch: { label: "KYC Mismatch", bg: "#fce4ec", text: "#b71c1c" },
    recalculated: { label: "Recalculated", bg: "#ede7f6", text: "#4527a0" },
    resolved: { label: "Resolved", bg: "#e0f2f1", text: "#00695c" },
    approved: { label: "Approved ✓", bg: "#e8f5e9", text: "#1b5e20" },
    declined: { label: "Declined", bg: "#ffebee", text: "#c62828" },
  };
  return map[status] || { label: status, bg: "#f5f5f5", text: "#555" };
}

function StatusBadge({ status }: { status: string }) {
  const s = statusLabel(status);
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      <View style={styles.sectionTitleLine} />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "—"}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "danger" | "warning" | "outline" | "success";
  loading?: boolean;
  disabled?: boolean;
}) {
  const variantStyles: Record<string, any> = {
    primary: { bg: "#2d7a2d", text: "#fff" },
    danger: { bg: "#c62828", text: "#fff" },
    warning: { bg: "#e65100", text: "#fff" },
    outline: { bg: "#fff", text: "#2d7a2d", border: "#2d7a2d" },
    success: { bg: "#1b5e20", text: "#fff" },
  };
  const vs = variantStyles[variant];
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        {
          backgroundColor: disabled || loading ? "#ccc" : vs.bg,
          borderWidth: vs.border ? 1.5 : 0,
          borderColor: vs.border || "transparent",
        },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={vs.text} size="small" />
      ) : (
        <Text
          style={[
            styles.actionButtonText,
            { color: disabled || loading ? "#888" : vs.text },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── DOB picker ───────────────────────────────────────────────────────────────

function DOBPickerField({
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
        <Text style={{ fontSize: 16 }}>📅</Text>
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

function GenderChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (g: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {["Male", "Female", "Other"].map((g) => (
        <TouchableOpacity
          key={g}
          style={[styles.chip, value === g && styles.chipActive]}
          onPress={() => onChange(g)}
        >
          <Text style={[styles.chipText, value === g && styles.chipTextActive]}>
            {g}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function TicketApprovalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ticket_id: string }>();
  const { staffInfo } = useTournament();

  const ticketId = Array.isArray(params.ticket_id)
    ? params.ticket_id[0]
    : params.ticket_id;

  const [state, setState] = useState<TicketState | null>(null);
  const [prefilledFailingIds, setPrefilledFailingIds] = useState<Set<string>>(
    new Set(),
  );
  const [menuPackageId, setMenuPackageId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showApplyOffer, setShowApplyOffer] = useState(false);
  const [selectedAlternativeOffer, setSelectedAlternativeOffer] =
    useState<any>(null);
  const [applyOfferLoading, setApplyOfferLoading] = useState(false);

  // ── Inline form states ─────────────────────────────────────────────────

  // KYC mismatch → recalculate
  const [showRecalcForm, setShowRecalcForm] = useState(false);
  const [recalcGender, setRecalcGender] = useState("");
  const [recalcDob, setRecalcDob] = useState<Date | null>(null);
  // Per-member recalc inputs for team tickets: keyed by player_id
  const [memberRecalcData, setMemberRecalcData] = useState<
    Record<string, { gender: string; dob: Date | null }>
  >({});
  const [selectedMismatches, setSelectedMismatches] = useState<string[]>([]);
  const [showNoDiscountOffers, setShowNoDiscountOffers] = useState(false);
  const [selectedNoDiscountOffer, setSelectedNoDiscountOffer] =
    useState<any>(null);

  // Resolved → KYC edit
  const [showKycEdit, setShowKycEdit] = useState(false);
  const [kycName, setKycName] = useState("");
  const [kycGender, setKycGender] = useState("");
  const [kycDob, setKycDob] = useState<Date | null>(null);

  // Collect extra payment
  const [showCollectExtra, setShowCollectExtra] = useState(false);
  const [collectExtraAmount, setCollectExtraAmount] = useState("");

  // Issue coupon
  const [showIssueCoupon, setShowIssueCoupon] = useState(false);
  const [couponType, setCouponType] = useState("INR");
  const [couponValue, setCouponValue] = useState("");
  const [couponReason, setCouponReason] = useState("");

  // Apply bucket
  const [showBucket, setShowBucket] = useState(false);
  const [bucketAmount, setBucketAmount] = useState("");

  // Decline reason
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // ── Fetch state ────────────────────────────────────────────────────────

  const fetchState = useCallback(async () => {
    if (!ticketId) return;
    try {
      const stateRes = await fetch(
        `${BASE_URL}/api/ticket-approval/${ticketId}/state`,
      );

      if (!stateRes.ok) throw new Error("Failed to fetch approval state");
      const stateData: TicketState = await stateRes.json();

      // Derive mismatch_type from audit log since API doesn't return it at top level
      const mismatchLog = stateData.audit_log
        ?.filter((e) => e.action === "kyc_mismatch")
        .pop();
      if (mismatchLog?.mismatch_type) {
        stateData.mismatch_type = mismatchLog.mismatch_type;
      }
      setState(stateData);

      // Derive mismatch_types from state or audit log fallback
      if (stateData.mismatch_types && stateData.mismatch_types.length > 0) {
        setSelectedMismatches(stateData.mismatch_types);
      } else {
        // fallback: parse from latest kyc_mismatch audit log
        const mismatchLog = stateData.audit_log
          ?.filter((e: any) => e.action === "kyc_mismatch")
          .pop();
        if (mismatchLog?.mismatch_type) {
          setSelectedMismatches(
            mismatchLog.mismatch_type.split(",").map((s: string) => s.trim()),
          );
        }
      }

      // Pre-fill KYC edit form from current player data
      if (stateData.player) {
        setKycName(stateData.player.player_name || "");
        setKycGender(stateData.player.gender || "");
        if (stateData.player.dob) {
          setKycDob(new Date(stateData.player.dob * 1000));
        }
      }

      setMenuPackageId(stateData.menu_package_id || "");

      // Fetch order data to get per-ticket breakdown and discount snapshot
      if (stateData.order_id) {
        try {
          const orderRes = await fetch(
            `${BASE_URL}/api/orders/${stateData.order_id}`,
          );
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            const perTicketEntry =
              (orderData.per_ticket_breakdown || []).find(
                (entry: any) => entry.ticket_id === ticketId,
              ) || null;
            setState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                discount_snapshot:
                  prev.discount_snapshot || orderData.discount_snapshot,
                per_ticket_entry: perTicketEntry,
              };
            });
          }
        } catch {
          // non-fatal
        }
      }
    } catch (err) {
      console.error("fetchState error:", err);
      showToast("Failed to load ticket state.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (!showRecalcForm) return;

    // Solo player — reset only, receptionist must enter actual values
    if (!state?.team_players?.length) {
      setRecalcGender("");
      setRecalcDob(null);
      return;
    }

    // Team — pre-fill each member's existing recorded data
    // Passing members: auto-filled and locked visually (green)
    // Failing members: auto-filled but highlighted red, must be changed before recalc
    const analysis = computeMismatchAnalysis();
    const failingIds = new Set(analysis.failingMembers.map((m) => m.player_id));

    const prefilled: Record<string, { gender: string; dob: Date | null }> = {};
    for (const member of state.team_players) {
      prefilled[member.player_id] = {
        gender: member.gender || "",
        dob: member.dob ? new Date(member.dob * 1000) : null,
      };
    }
    setMemberRecalcData(prefilled);
    setPrefilledFailingIds(failingIds);
  }, [showRecalcForm]);

  // ── Get receptionist ID ────────────────────────────────────────────────

  const getReceptionistId = async (): Promise<string | null> => {
    const token = await AsyncStorage.getItem("staff_token");
    const payload = token ? parseJwt(token) : null;
    return payload?.staff_id || staffInfo?.staff_id || null;
  };

  // ── API calls ──────────────────────────────────────────────────────────

  const callAPI = async (
    endpoint: string,
    body: object,
    successMsg: string,
  ) => {
    setActionLoading(true);
    try {
      const receptionistId = await getReceptionistId();
      if (!receptionistId) {
        Alert.alert(
          "Error",
          "Could not identify receptionist. Please re-login.",
        );
        return false;
      }
      console.log(
        `[callAPI] POST ${BASE_URL}/api/ticket-approval/${ticketId}/${endpoint}`,
      );
      console.log(
        `[callAPI] body:`,
        JSON.stringify({ receptionist_id: receptionistId, ...body }, null, 2),
      );
      const res = await fetch(
        `${BASE_URL}/api/ticket-approval/${ticketId}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receptionist_id: receptionistId, ...body }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        console.error(`[callAPI] ${endpoint} failed — status: ${res.status}`);
        console.error(
          `[callAPI] request body:`,
          JSON.stringify({ receptionist_id: receptionistId, ...body }, null, 2),
        );
        console.error(`[callAPI] response:`, JSON.stringify(data, null, 2));
        Alert.alert("Error", data.detail || "Action failed.");
        return false;
      }

      showToast(successMsg);
      await fetchState();
      return true;
    } catch {
      Alert.alert("Error", "Something went wrong.");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Verify KYC
  const handleVerifyKYC = (mismatches?: string[]) => {
    const hasMismatches = mismatches && mismatches.length > 0;
    const label = hasMismatches
      ? `Flag ${mismatches.join(" & ")} mismatch? This cannot be reversed.`
      : "Mark KYC as verified? This cannot be reversed.";

    Alert.alert("Are you sure?", label, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () =>
          callAPI(
            "verify-kyc",
            { mismatch_types: mismatches || [] },
            hasMismatches
              ? "KYC mismatch flagged."
              : "KYC verified successfully.",
          ),
      },
    ]);
  };

  interface MismatchAnalysis {
    conditionScope: "any" | "all";
    passingMembers: TeamPlayerInfo[];
    failingMembers: TeamPlayerInfo[];
    autoFlags: string[];
    shouldBlockVerify: boolean;
  }

  const computeMismatchAnalysis = (): MismatchAnalysis => {
    const empty: MismatchAnalysis = {
      conditionScope: "any",
      passingMembers: [],
      failingMembers: [],
      autoFlags: [],
      shouldBlockVerify: false,
    };

    if (!state?.discount_snapshot?.selected_offer?.condition_summary) {
      return empty;
    }

    const cond = state.discount_snapshot.selected_offer.condition_summary;
    const conditionScope: "any" | "all" =
      cond.condition_scope === "all" ? "all" : "any";

    // Use team_players if available, else fall back to primary player
    const members: TeamPlayerInfo[] =
      state.team_players?.length > 0
        ? state.team_players
        : state.player
          ? [
              {
                player_id: state.player.player_id || "",
                player_name: state.player.player_name,
                gender: state.player.gender,
                dob: state.player.dob,
                age: (() => {
                  if (!state.player?.dob) return null;
                  const dob = new Date(state.player.dob * 1000);
                  const today = new Date();
                  let age = today.getFullYear() - dob.getFullYear();
                  const m = today.getMonth() - dob.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < dob.getDate()))
                    age--;
                  return age;
                })(),
              },
            ]
          : [];

    const memberSatisfies = (member: TeamPlayerInfo): boolean => {
      // Gender check
      if (cond.gender && cond.gender.length > 0 && member.gender) {
        if (
          !cond.gender
            .map((g: string) => g.toLowerCase())
            .includes(member.gender.toLowerCase())
        ) {
          return false;
        }
      }
      // Age check
      if (
        (cond.min_age != null || cond.max_age != null) &&
        member.age != null
      ) {
        if (cond.min_age != null && member.age < cond.min_age) return false;
        if (cond.max_age != null && member.age > cond.max_age) return false;
      } else if (
        (cond.min_age != null || cond.max_age != null) &&
        member.age == null
      ) {
        return false;
      }
      return true;
    };

    const passing: TeamPlayerInfo[] = [];
    const failing: TeamPlayerInfo[] = [];
    for (const m of members) {
      if (memberSatisfies(m)) passing.push(m);
      else failing.push(m);
    }

    // Determine auto flags from failing members
    const autoFlags: string[] = [];
    for (const m of failing) {
      if (cond.gender && cond.gender.length > 0 && m.gender) {
        if (
          !cond.gender
            .map((g: string) => g.toLowerCase())
            .includes(m.gender.toLowerCase())
        ) {
          if (!autoFlags.includes("gender")) autoFlags.push("gender");
        }
      }
      if ((cond.min_age != null || cond.max_age != null) && m.age != null) {
        if (
          (cond.min_age != null && m.age < cond.min_age) ||
          (cond.max_age != null && m.age > cond.max_age)
        ) {
          if (!autoFlags.includes("age")) autoFlags.push("age");
        }
      }
    }

    // Block verify only when scope=all and any member fails
    const shouldBlockVerify = conditionScope === "all" && failing.length > 0;

    return {
      conditionScope,
      passingMembers: passing,
      failingMembers: failing,
      autoFlags,
      shouldBlockVerify,
    };
  };

  // Keep backward-compatible alias for existing code that calls computeAutoMismatches
  const computeAutoMismatches = (): string[] =>
    computeMismatchAnalysis().autoFlags;

  // Recalculate
  const handleRecalculate = async () => {
    const hasGenderMismatch = selectedMismatches.includes("gender");
    const hasAgeMismatch = selectedMismatches.includes("age");
    const isTeam = (state?.team_players?.length ?? 0) > 0;

    if (isTeam) {
      // Validate per-member inputs
      const members = state!.team_players;
      for (const member of members) {
        const mData = memberRecalcData[member.player_id] || {
          gender: "",
          dob: null,
        };
        if (hasGenderMismatch && !mData.gender) {
          Alert.alert(
            "Required",
            `Gender mismatch flagged — select actual gender for ${member.player_name || member.player_id}.`,
          );
          return;
        }
        if (hasAgeMismatch && !mData.dob) {
          Alert.alert(
            "Required",
            `Age mismatch flagged — select actual date of birth for ${member.player_name || member.player_id}.`,
          );
          return;
        }
      }
      if (!menuPackageId) {
        Alert.alert(
          "Error",
          "Could not determine menu package. Please go back and retry.",
        );
        return;
      }

      // Warn if failing members still have same data as originally recorded
      const analysis = computeMismatchAnalysis();
      const unchangedFailingMembers = analysis.failingMembers.filter(
        (member) => {
          const mData = memberRecalcData[member.player_id];
          if (!mData) return true;
          const genderUnchanged =
            hasGenderMismatch && (mData.gender || "") === (member.gender || "");
          const dobUnchanged =
            hasAgeMismatch &&
            (mData.dob ? mData.dob.toDateString() : "") ===
              (member.dob ? new Date(member.dob * 1000).toDateString() : "");
          return genderUnchanged || dobUnchanged;
        },
      );

      if (unchangedFailingMembers.length > 0) {
        const names = unchangedFailingMembers
          .map((m) => m.player_name || m.player_id)
          .join(", ");
        Alert.alert(
          "Data unchanged for mismatched members",
          `You have not updated the data for: ${names}. Their pre-filled values will be used as-is. Proceed?`,
          [
            { text: "Go back and fix", style: "cancel" },
            {
              text: "Proceed anyway",
              onPress: async () => {
                if (!menuPackageId) {
                  Alert.alert("Error", "Could not determine menu package.");
                  return;
                }
                setActionLoading(true);
                try {
                  const receptionistId = await getReceptionistId();
                  if (!receptionistId) {
                    Alert.alert("Error", "Could not identify receptionist.");
                    return;
                  }
                  for (const member of members) {
                    const mData = memberRecalcData[member.player_id] || {
                      gender: "",
                      dob: null,
                    };
                    const kycBody: any = {};
                    if (hasGenderMismatch && mData.gender)
                      kycBody.gender = mData.gender;
                    if (hasAgeMismatch && mData.dob)
                      kycBody.dob = Math.floor(mData.dob.getTime() / 1000);
                    if (Object.keys(kycBody).length === 0) continue;
                    await fetch(
                      `${BASE_URL}/api/ticket-approval/${ticketId}/correct-kyc`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          receptionist_id: receptionistId,
                          player_id: member.player_id,
                          ...kycBody,
                        }),
                      },
                    );
                  }
                  const primaryMember = members[0];
                  const primaryData = memberRecalcData[
                    primaryMember.player_id
                  ] || { gender: "", dob: null };
                  const body: any = { menu_package_id: menuPackageId };
                  if (primaryData.gender)
                    body.actual_gender = primaryData.gender;
                  if (primaryData.dob) {
                    const today = new Date();
                    let age =
                      today.getFullYear() - primaryData.dob.getFullYear();
                    const m = today.getMonth() - primaryData.dob.getMonth();
                    if (
                      m < 0 ||
                      (m === 0 && today.getDate() < primaryData.dob.getDate())
                    )
                      age--;
                    body.actual_age = age;
                  }
                  const ok = await callAPI(
                    "recalculate",
                    body,
                    "Price recalculated.",
                  );
                  if (ok) {
                    setShowRecalcForm(false);
                    setMemberRecalcData({});
                  }
                } finally {
                  setActionLoading(false);
                }
              },
            },
          ],
        );
        return;
      }

      await new Promise<void>((resolve, reject) => {
        Alert.alert(
          "Confirm Recalculation",
          "Are you sure you want to recalculate the price? This will update the ticket and cannot be undone.",
          [
            { text: "Cancel", style: "cancel", onPress: reject },
            { text: "Yes, Recalculate", onPress: () => resolve() },
          ],
        );
      })
        .catch(() => {
          setActionLoading(false);
          return Promise.reject();
        })
        .catch(() => {
          return;
        });

      setActionLoading(true);
      try {
        const receptionistId = await getReceptionistId();
        if (!receptionistId) {
          Alert.alert(
            "Error",
            "Could not identify receptionist. Please re-login.",
          );
          return;
        }

        // Patch each team member's KYC first, passing player_id so backend
        // patches the correct player record regardless of who the ticket buyer is
        for (const member of members) {
          const mData = memberRecalcData[member.player_id] || {
            gender: "",
            dob: null,
          };
          const kycBody: any = {};
          if (hasGenderMismatch && mData.gender) kycBody.gender = mData.gender;
          if (hasAgeMismatch && mData.dob)
            kycBody.dob = Math.floor(mData.dob.getTime() / 1000);
          if (Object.keys(kycBody).length === 0) continue;

          const response = await fetch(
            `${BASE_URL}/api/ticket-approval/${ticketId}/correct-kyc`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                receptionist_id: receptionistId,
                player_id: member.player_id,
                ...kycBody,
              }),
            },
          );
          console.log(
            `[handleRecalculate] KYC patch for ${member.player_id} response:`,
            response.json(),
            {
              receptionist_id: receptionistId,
              player_id: member.player_id,
              ...kycBody,
            },
          );
        }

        // Use first member's values for the recalculate call
        const primaryMember = members[0];
        const primaryData = memberRecalcData[primaryMember.player_id] || {
          gender: "",
          dob: null,
        };
        const body: any = { menu_package_id: menuPackageId };
        if (primaryData.gender) body.actual_gender = primaryData.gender;
        if (primaryData.dob) {
          const today = new Date();
          let age = today.getFullYear() - primaryData.dob.getFullYear();
          const m = today.getMonth() - primaryData.dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < primaryData.dob.getDate()))
            age--;
          body.actual_age = age;
        }

        const ok = await callAPI("recalculate", body, "Price recalculated.");
        if (ok) {
          setShowRecalcForm(false);
          setMemberRecalcData({});
        }
      } finally {
        setActionLoading(false);
      }
      return;
    }

    // Solo player flow
    if (hasGenderMismatch && !recalcGender) {
      Alert.alert(
        "Required",
        "Gender mismatch was flagged — select the player's actual gender.",
      );
      return;
    }
    if (hasAgeMismatch && !recalcDob) {
      Alert.alert(
        "Required",
        "Age mismatch was flagged — select the player's actual date of birth.",
      );
      return;
    }
    if (!hasGenderMismatch && !hasAgeMismatch && !recalcGender && !recalcDob) {
      Alert.alert(
        "Required",
        "Enter actual gender or date of birth to recalculate.",
      );
      return;
    }
    if (hasGenderMismatch && hasAgeMismatch && (!recalcGender || !recalcDob)) {
      Alert.alert(
        "Required",
        "Both gender and age mismatch flagged — both fields are required.",
      );
      return;
    }
    if (!menuPackageId) {
      Alert.alert(
        "Error",
        "Could not determine menu package. Please go back and retry.",
      );
      return;
    }

    const body: any = { menu_package_id: menuPackageId };
    if (recalcGender) body.actual_gender = recalcGender;
    if (recalcDob) {
      const today = new Date();
      let age = today.getFullYear() - recalcDob.getFullYear();
      const m = today.getMonth() - recalcDob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < recalcDob.getDate())) age--;
      body.actual_age = age;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Confirm Recalculation",
        "Are you sure you want to recalculate the price? This cannot be undone.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Yes, Recalculate", onPress: () => resolve(true) },
        ],
      );
    });
    if (!confirmed) return;

    const ok = await callAPI("recalculate", body, "Price recalculated.");
    console.log("recalculate KYC patch body:", {
      body,
    });

    if (ok) {
      // Auto-patch KYC with entered values
      const receptionistId = await getReceptionistId();
      if (receptionistId) {
        const kycBody: any = {};
        if (recalcGender) kycBody.gender = recalcGender;
        if (recalcDob) kycBody.dob = Math.floor(recalcDob.getTime() / 1000);
        if (Object.keys(kycBody).length > 0) {
          await fetch(
            `${BASE_URL}/api/ticket-approval/${ticketId}/correct-kyc`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                receptionist_id: receptionistId,
                player_id: state?.player?.player_id,
                ...kycBody,
              }),
            },
          );
        }
      }
      setShowRecalcForm(false);
    }
  };

  // Collect extra
  const handleCollectExtra = async () => {
    const amount = parseFloat(collectExtraAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Required", "Enter a valid amount collected.");
      return;
    }
    const ok = await callAPI(
      "collect-extra",
      { amount_collected: amount },
      "Extra payment recorded.",
    );
    if (ok) setShowCollectExtra(false);
  };

  // Issue coupon
  const handleIssueCoupon = async () => {
    const value = parseFloat(couponValue);
    if (!value || value <= 0 || !couponReason.trim()) {
      Alert.alert("Required", "Enter coupon value and reason.");
      return;
    }
    const ok = await callAPI(
      "issue-coupon",
      {
        issued_reason: couponReason.trim(),
        coupon_currency_type: couponType,
        value,
      },
      "Coupon issued successfully.",
    );
    if (ok) setShowIssueCoupon(false);
  };

  // Apply bucket
  const handleApplyBucket = async () => {
    const amount = parseFloat(bucketAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Required", "Enter a valid discount amount.");
      return;
    }
    const ok = await callAPI(
      "apply-bucket",
      { amount },
      "Bucket discount applied.",
    );
    if (ok) setShowBucket(false);
  };

  // Approve
  const handleApprove = () => {
    Alert.alert(
      "Final Approval",
      "Approve this ticket? This will create performance entries and allow score entry.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () =>
            callAPI(
              "approve",
              {},
              "Ticket approved! Performance entries created.",
            ),
        },
      ],
    );
  };

  // Decline
  const handleDecline = async () => {
    if (!declineReason.trim()) {
      Alert.alert("Required", "Enter a reason for declining.");
      return;
    }
    const ok = await callAPI(
      "decline",
      { notes: declineReason.trim() },
      "Ticket declined.",
    );
    if (ok) setShowDeclineForm(false);
  };

  const handleApplyOffer = async (offerOverride?: any) => {
    const offerToApply = offerOverride || selectedAlternativeOffer;
    if (!offerToApply || !menuPackageId) {
      Alert.alert("Required", "Select a discount offer to apply.");
      return;
    }
    setApplyOfferLoading(true);
    try {
      const receptionistId = await getReceptionistId();
      if (!receptionistId) {
        Alert.alert(
          "Error",
          "Could not identify receptionist. Please re-login.",
        );
        return;
      }
      const res = await fetch(
        `${BASE_URL}/api/ticket-approval/${ticketId}/apply-offer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receptionist_id: receptionistId,
            discount_id: offerToApply.discount_id,
            menu_package_id: menuPackageId,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Error", data.detail || "Failed to apply offer.");
        return;
      }
      showToast("Offer applied successfully.");
      setShowApplyOffer(false);
      setSelectedAlternativeOffer(null);
      await fetchState();
    } catch {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setApplyOfferLoading(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────

  // Gender chips

  // Price diff display
  const renderPriceDiff = () => {
    if (!state?.recalculated_amount || !state?.booking_amount) return null;
    const orig = state.booking_amount;
    const recalc = state.recalculated_amount;
    const diff = recalc - orig;
    return (
      <View style={styles.priceDiffCard}>
        <Text style={styles.priceDiffTitle}>Price Adjustment</Text>
        <View style={styles.priceDiffRow}>
          <View style={styles.priceDiffItem}>
            <Text style={styles.priceDiffLabel}>Original Paid</Text>
            <Text style={styles.priceDiffAmount}>₹{orig}</Text>
          </View>
          <Text style={styles.priceDiffArrow}>→</Text>
          <View style={styles.priceDiffItem}>
            <Text style={styles.priceDiffLabel}>Correct Price</Text>
            <Text style={styles.priceDiffAmount}>₹{recalc}</Text>
          </View>
        </View>
        {diff > 0 ? (
          <View
            style={[styles.priceDiffResult, { backgroundColor: "#fce4ec" }]}
          >
            <Text style={[styles.priceDiffResultText, { color: "#b71c1c" }]}>
              ₹{diff.toFixed(2)} extra to collect from player
            </Text>
          </View>
        ) : (
          <View
            style={[styles.priceDiffResult, { backgroundColor: "#e8f5e9" }]}
          >
            <Text style={[styles.priceDiffResultText, { color: "#2e7d32" }]}>
              ₹{Math.abs(diff).toFixed(2)} benefit owed to player
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Audit trail
  const renderAuditTrail = () => {
    if (!state?.audit_log?.length) return null;
    const actionLabels: Record<string, string> = {
      arrived: "Marked Arrived",
      kyc_verified: "KYC Verified",
      kyc_mismatch: "KYC Mismatch Flagged",
      recalculated: "Price Recalculated",
      extra_collected: "Extra Payment Collected",
      bucket_applied: "Bucket Discount Applied",
      coupon_issued: "Coupon Issued",
      kyc_corrected: "KYC Corrected",
      approved: "Final Approved",
      declined: "Declined",
      venue_registration: "Registered at Venue",
    };
    return (
      <View style={styles.auditCard}>
        <SectionTitle title="Audit Trail" />
        {state.audit_log.map((entry, i) => (
          <View key={entry.log_id || i} style={styles.auditEntry}>
            <View style={styles.auditDot} />
            <View style={styles.auditContent}>
              <Text style={styles.auditAction}>
                {actionLabels[entry.action] || entry.action}
              </Text>
              <Text style={styles.auditTime}>
                {tsToString(entry.timestamp)}
              </Text>
              {entry.notes && (
                <Text style={styles.auditNotes}>{entry.notes}</Text>
              )}
              {entry.mismatch_type && (
                <Text style={styles.auditDetail}>
                  Mismatch: {entry.mismatch_type}
                </Text>
              )}
              {entry.original_amount != null &&
                entry.recalculated_amount != null && (
                  <Text style={styles.auditDetail}>
                    ₹{entry.original_amount} → ₹{entry.recalculated_amount}
                  </Text>
                )}
              {entry.kyc_changes &&
                Object.keys(entry.kyc_changes).length > 0 && (
                  <View style={styles.kycChangesBox}>
                    {Object.entries(entry.kyc_changes).map(
                      ([field, change]: any) => (
                        <Text key={field} style={styles.kycChangeText}>
                          {field}: {String(change.old_value)} →{" "}
                          {String(change.new_value)}
                        </Text>
                      ),
                    )}
                  </View>
                )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ── Inline forms ───────────────────────────────────────────────────────

  const renderRecalcForm = () => {
    const hasGenderMismatch = selectedMismatches.includes("gender");
    const hasAgeMismatch = selectedMismatches.includes("age");
    const isTeam = (state?.team_players?.length ?? 0) > 0;

    if (isTeam && state?.team_players) {
      return (
        <View style={styles.inlineForm}>
          <Text style={styles.inlineFormTitle}>
            Enter Actual Details Per Player
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Roboto-Regular",
              color: "#666",
              marginBottom: 10,
              lineHeight: 18,
            }}
          >
            Enter what you physically verified for each team member.
          </Text>

          {state.team_players.map((member, idx) => {
            const mData = memberRecalcData[member.player_id] || {
              gender: "",
              dob: null,
            };
            const setMGender = (g: string) =>
              setMemberRecalcData((prev) => ({
                ...prev,
                [member.player_id]: {
                  ...(prev[member.player_id] || { gender: "", dob: null }),
                  gender: g,
                },
              }));
            const setMDob = (d: Date) =>
              setMemberRecalcData((prev) => ({
                ...prev,
                [member.player_id]: {
                  ...(prev[member.player_id] || { gender: "", dob: null }),
                  dob: d,
                },
              }));

            const isFailing = prefilledFailingIds.has(member.player_id);
            const borderColor = isFailing ? "#c62828" : "#2e7d32";
            const bgColor = isFailing ? "#fff8f8" : "#f8fff8";

            return (
              <View
                key={member.player_id}
                style={{
                  marginBottom: 16,
                  padding: 12,
                  backgroundColor: bgColor,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: borderColor,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Roboto-SemiBold",
                      color: "#333",
                      flex: 1,
                    }}
                  >
                    {idx === 0 ? "Team Leader" : `Member ${idx + 1}`}:{" "}
                    {member.player_name || member.player_id}
                  </Text>
                  <View
                    style={{
                      backgroundColor: isFailing ? "#fce4ec" : "#e8f5e9",
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Roboto-SemiBold",
                        color: isFailing ? "#b71c1c" : "#2e7d32",
                      }}
                    >
                      {isFailing ? "⚠ Mismatch" : "✓ OK"}
                    </Text>
                  </View>
                </View>

                {/* Current recorded values */}
                <View
                  style={{
                    backgroundColor: "#f0f0f0",
                    borderRadius: 6,
                    padding: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Roboto-SemiBold",
                      color: "#888",
                      marginBottom: 2,
                    }}
                  >
                    RECORDED: Gender: {member.gender || "?"} · Age:{" "}
                    {member.age ?? "?"}
                  </Text>
                </View>

                {hasGenderMismatch && (
                  <>
                    <Text style={styles.inlineFormLabel}>
                      {isFailing
                        ? "Actual Gender * (pre-filled, change if wrong)"
                        : "Gender (pre-filled, confirmed)"}
                    </Text>
                    <GenderChips value={mData.gender} onChange={setMGender} />
                  </>
                )}
                {hasAgeMismatch && (
                  <>
                    <Text style={styles.inlineFormLabel}>
                      {isFailing
                        ? "Actual Date of Birth * (pre-filled, change if wrong)"
                        : "Date of Birth (pre-filled, confirmed)"}
                    </Text>
                    <DOBPickerField value={mData.dob} onChange={setMDob} />
                  </>
                )}
                {!hasGenderMismatch && !hasAgeMismatch && (
                  <>
                    <Text style={styles.inlineFormLabel}>Gender</Text>
                    <GenderChips value={mData.gender} onChange={setMGender} />
                    <Text style={styles.inlineFormLabel}>Date of Birth</Text>
                    <DOBPickerField value={mData.dob} onChange={setMDob} />
                  </>
                )}
              </View>
            );
          })}

          <View style={styles.inlineFormButtons}>
            <ActionButton
              label="Cancel"
              onPress={() => setShowRecalcForm(false)}
              variant="outline"
            />
            <ActionButton
              label="Recalculate"
              onPress={handleRecalculate}
              loading={actionLoading}
            />
          </View>
        </View>
      );
    }

    // Solo form — unchanged logic, just field visibility based on mismatch flags
    const currentGender = state?.player?.gender || "Not recorded";
    const currentDob = state?.player?.dob
      ? dobToString(state.player.dob)
      : "Not recorded";

    return (
      <View style={styles.inlineForm}>
        <Text style={styles.inlineFormTitle}>Enter Actual Player Details</Text>
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Roboto-Regular",
            color: "#666",
            marginBottom: 10,
            lineHeight: 18,
          }}
        >
          Enter what you physically verified. This will recalculate the correct
          price.
        </Text>

        <View
          style={{
            backgroundColor: "#f5f5f5",
            borderRadius: 8,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Roboto-SemiBold",
              color: "#888",
              marginBottom: 4,
            }}
          >
            CURRENTLY RECORDED IN SYSTEM
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Roboto-Regular",
              color: "#555",
            }}
          >
            Gender: {currentGender}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Roboto-Regular",
              color: "#555",
            }}
          >
            Date of Birth: {currentDob}
          </Text>
        </View>

        {hasGenderMismatch && (
          <>
            <Text style={styles.inlineFormLabel}>
              Actual Gender (physically verified) *
            </Text>
            <View
              style={{
                backgroundColor: "#fff3e0",
                borderRadius: 6,
                padding: 8,
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Roboto-Regular",
                  color: "#e65100",
                }}
              >
                ⚠ Gender mismatch was flagged. Select what you see physically.
              </Text>
            </View>
            <GenderChips value={recalcGender} onChange={setRecalcGender} />
          </>
        )}

        {hasAgeMismatch && (
          <>
            <Text style={styles.inlineFormLabel}>
              Actual Date of Birth (physically verified) *
            </Text>
            <View
              style={{
                backgroundColor: "#fff3e0",
                borderRadius: 6,
                padding: 8,
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Roboto-Regular",
                  color: "#e65100",
                }}
              >
                ⚠ Age mismatch was flagged. Enter actual date of birth.
              </Text>
            </View>
            <DOBPickerField value={recalcDob} onChange={setRecalcDob} />
          </>
        )}

        {!hasGenderMismatch && !hasAgeMismatch && (
          <>
            <Text style={styles.inlineFormLabel}>Actual Gender</Text>
            <GenderChips value={recalcGender} onChange={setRecalcGender} />
            <Text style={styles.inlineFormLabel}>Actual Date of Birth</Text>
            <DOBPickerField value={recalcDob} onChange={setRecalcDob} />
          </>
        )}

        <View style={styles.inlineFormButtons}>
          <ActionButton
            label="Cancel"
            onPress={() => setShowRecalcForm(false)}
            variant="outline"
          />
          <ActionButton
            label="Recalculate"
            onPress={handleRecalculate}
            loading={actionLoading}
          />
        </View>
      </View>
    );
  };

  const renderCollectExtraForm = (maxAmount: number) => (
    <View style={styles.inlineForm}>
      <Text style={styles.inlineFormTitle}>Confirm Extra Payment</Text>
      <Text style={styles.inlineFormLabel}>
        Amount Collected (₹) — max ₹{maxAmount.toFixed(2)}
      </Text>
      <TextInput
        style={styles.inlineInput}
        value={collectExtraAmount}
        onChangeText={(t) => {
          const val = t.replace(/[^0-9.]/g, "");
          if (parseFloat(val) > maxAmount) return;
          setCollectExtraAmount(val);
        }}
        placeholder={`Enter amount (max ₹${maxAmount.toFixed(2)})`}
        placeholderTextColor="#aaa"
        keyboardType="decimal-pad"
      />
      <View style={styles.inlineFormButtons}>
        <ActionButton
          label="Cancel"
          onPress={() => setShowCollectExtra(false)}
          variant="outline"
        />
        <ActionButton
          label="Confirm Collection"
          onPress={handleCollectExtra}
          loading={actionLoading}
        />
      </View>
    </View>
  );

  const renderIssueCouponForm = (maxAmount: number) => (
    <View style={styles.inlineForm}>
      <Text style={styles.inlineFormTitle}>Issue Benefit Coupon</Text>
      <Text style={styles.inlineFormLabel}>Coupon Type</Text>
      <View style={styles.chipRow}>
        {["INR", "credits", "points", "free_activity"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, couponType === t && styles.chipActive]}
            onPress={() => setCouponType(t)}
          >
            <Text
              style={[
                styles.chipText,
                couponType === t && styles.chipTextActive,
              ]}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.inlineFormLabel}>
        Value — max ₹{maxAmount.toFixed(2)}
      </Text>
      <TextInput
        style={styles.inlineInput}
        value={couponValue}
        onChangeText={(t) => {
          const val = t.replace(/[^0-9.]/g, "");
          if (parseFloat(val) > maxAmount) return;
          setCouponValue(val);
        }}
        placeholder={`Coupon value (max ₹${maxAmount.toFixed(2)})`}
        placeholderTextColor="#aaa"
        keyboardType="decimal-pad"
      />
      <Text style={styles.inlineFormLabel}>Reason</Text>
      <TextInput
        style={styles.inlineInput}
        value={couponReason}
        onChangeText={setCouponReason}
        placeholder="Reason for issuing coupon"
        placeholderTextColor="#aaa"
      />
      <View style={styles.inlineFormButtons}>
        <ActionButton
          label="Cancel"
          onPress={() => setShowIssueCoupon(false)}
          variant="outline"
        />
        <ActionButton
          label="Issue Coupon"
          onPress={handleIssueCoupon}
          loading={actionLoading}
        />
      </View>
    </View>
  );

  const renderBucketForm = (maxAmount: number) => (
    <View style={styles.inlineForm}>
      <Text style={styles.inlineFormTitle}>Apply Bucket Discount</Text>
      <Text style={styles.inlineFormLabel}>
        Discount Amount (₹) — max ₹{maxAmount.toFixed(2)}
      </Text>
      <TextInput
        style={styles.inlineInput}
        value={bucketAmount}
        onChangeText={(t) => {
          const val = t.replace(/[^0-9.]/g, "");
          if (parseFloat(val) > maxAmount) return;
          setBucketAmount(val);
        }}
        placeholder={`Amount from your bucket (max ₹${maxAmount.toFixed(2)})`}
        placeholderTextColor="#aaa"
        keyboardType="decimal-pad"
      />
      <View style={styles.inlineFormButtons}>
        <ActionButton
          label="Cancel"
          onPress={() => setShowBucket(false)}
          variant="outline"
        />
        <ActionButton
          label="Apply"
          onPress={handleApplyBucket}
          loading={actionLoading}
        />
      </View>
    </View>
  );

  const renderDeclineForm = () => (
    <View style={styles.inlineForm}>
      <Text style={styles.inlineFormTitle}>Decline Reason</Text>
      <TextInput
        style={[
          styles.inlineInput,
          { minHeight: 80, textAlignVertical: "top" },
        ]}
        value={declineReason}
        onChangeText={setDeclineReason}
        placeholder="Enter reason for declining this ticket"
        placeholderTextColor="#aaa"
        multiline
      />
      <View style={styles.inlineFormButtons}>
        <ActionButton
          label="Cancel"
          onPress={() => setShowDeclineForm(false)}
          variant="outline"
        />
        <ActionButton
          label="Decline Ticket"
          onPress={handleDecline}
          variant="danger"
          loading={actionLoading}
        />
      </View>
    </View>
  );

  // ── Status-based action panels ─────────────────────────────────────────
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const renderActionPanel = () => {
    if (!state) return null;
    const { ticket_status } = state;

    const isOfferEligible = (offer: any, currentBookingAmount: number) => {
      const cond = offer.condition_summary;
      if (!cond) return true;

      const members =
        state.team_players?.length > 0
          ? state.team_players.map((p: any) => ({
              ...p,
              age: p.dob
                ? (() => {
                    const dob = new Date(p.dob * 1000);
                    const today = new Date();
                    let age = today.getFullYear() - dob.getFullYear();
                    const m = today.getMonth() - dob.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < dob.getDate()))
                      age--;
                    return age;
                  })()
                : null,
            }))
          : state.player
            ? [
                {
                  ...state.player,
                  age: state.player.dob
                    ? (() => {
                        const dob = new Date(state.player.dob * 1000);
                        const today = new Date();
                        let age = today.getFullYear() - dob.getFullYear();
                        const m = today.getMonth() - dob.getMonth();
                        if (
                          m < 0 ||
                          (m === 0 && today.getDate() < dob.getDate())
                        )
                          age--;
                        return age;
                      })()
                    : null,
                },
              ]
            : [];

      // 1. Min purchase amount
      const minPurchase = parseFloat(cond.min_purchase_amt) || 0;
      if (minPurchase > 0 && currentBookingAmount < minPurchase) return false;

      // 2. Applicable days
      const applicableDays = cond.applicable_days || [];
      const nowDay = new Date().toLocaleDateString("en-US", {
        weekday: "long",
      });
      if (applicableDays.length > 0 && !applicableDays.includes(nowDay))
        return false;

      // 3. Check member demographics (if members exist)
      if (members.length > 0) {
        const satisfies = (member: any) => {
          if (cond.gender && cond.gender.length > 0 && member.gender) {
            if (
              !cond.gender
                .map((g: string) => g.toLowerCase())
                .includes(member.gender.toLowerCase())
            ) {
              return false;
            }
          }
          if (
            (cond.min_age != null || cond.max_age != null) &&
            member.age != null
          ) {
            if (cond.min_age != null && member.age < cond.min_age) return false;
            if (cond.max_age != null && member.age > cond.max_age) return false;
          } else if (
            (cond.min_age != null || cond.max_age != null) &&
            member.age == null
          ) {
            return false;
          }
          return true;
        };

        const passing = members.filter(satisfies);
        if (cond.condition_scope === "any") {
          if (passing.length === 0) return false;
        } else {
          if (passing.length !== members.length) return false;
        }
      }

      // Check for usage limit if explicitly provided in the offer (if backend adds it later)
      if (offer.usage_limit_reached) return false;

      // 4. Validity window
      const validFrom = offer.valid_from ?? offer.validFrom;
      const validTo = offer.valid_to ?? offer.validTo;
      const nowTs = Math.floor(Date.now() / 1000);
      if (validFrom && validFrom !== "" && nowTs < parseInt(validFrom))
        return false;
      if (validTo && validTo !== "" && nowTs > parseInt(validTo)) return false;

      // 5. Global usage limit
      const usageLimit = offer.usage_limit ?? offer.usageLimit;
      const usageCount = offer.usage_count ?? offer.usageCount;
      if (usageLimit != null && usageLimit !== "" && usageCount != null) {
        if (parseInt(usageCount) >= parseInt(usageLimit)) return false;
      }

      // 6. Per-user usage limit
      const userUsageLimit = offer.user_usage_limit ?? offer.userUsageLimit;
      const perUserUsage = offer.per_user_usage ?? offer.perUserUsage;
      if (userUsageLimit != null && userUsageLimit !== "") {
        const phone = state.player?.phone_no || state.bought_by;
        if (phone && perUserUsage) {
          const userCount = parseInt(perUserUsage[phone] || 0);
          if (userCount >= parseInt(userUsageLimit)) return false;
        }
      }

      return true;
    };

    // ── PURCHASED / ARRIVED ──────────────────────────────────────────────
    if (ticket_status === "purchased" || ticket_status === "arrived") {
      const hasNoDiscount =
        !state.discount_snapshot?.selected_offer?.discount_id;
      const availableOffers = state.discount_snapshot?.available_offers || [];
      const autoMismatches = computeAutoMismatches();

      return (
        <View style={styles.actionPanel}>
          <SectionTitle title="KYC Verification" />
          <Text style={styles.actionPanelHint}>
            Compare the player's details above with the person in front of you.
          </Text>

          {/* Team member mismatch analysis */}
          {(() => {
            const analysis = computeMismatchAnalysis();
            if (
              analysis.passingMembers.length === 0 &&
              analysis.failingMembers.length === 0
            )
              return null;
            return (
              <>
                {/* Scope banner */}
                {analysis.conditionScope === "all" &&
                  analysis.failingMembers.length > 0 && (
                    <View
                      style={[
                        styles.mismatchAlert,
                        { backgroundColor: "#fce4ec", marginBottom: 8 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.mismatchAlertText,
                          { color: "#b71c1c", fontFamily: "Roboto-SemiBold" },
                        ]}
                      >
                        ✕ Scope: ALL members must match —{" "}
                        {analysis.failingMembers.length} member(s) fail
                        conditions. KYC verification is blocked. You must flag
                        mismatch and recalculate.
                      </Text>
                    </View>
                  )}
                {analysis.conditionScope === "any" &&
                  analysis.failingMembers.length > 0 && (
                    <View
                      style={[
                        styles.mismatchAlert,
                        { backgroundColor: "#fff3e0", marginBottom: 8 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.mismatchAlertText,
                          { color: "#e65100", fontFamily: "Roboto-SemiBold" },
                        ]}
                      >
                        ⚠ Scope: ANY member — {analysis.passingMembers.length}{" "}
                        qualifies, {analysis.failingMembers.length} does not.
                        You may still verify KYC or flag a mismatch.
                      </Text>
                    </View>
                  )}

                {/* Passing members */}
                {analysis.passingMembers.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Roboto-SemiBold",
                        color: "#2e7d32",
                        marginBottom: 4,
                      }}
                    >
                      ✓ Qualifying members:
                    </Text>
                    {analysis.passingMembers.map((m) => (
                      <Text
                        key={m.player_id}
                        style={{
                          fontSize: 11,
                          fontFamily: "Roboto-Regular",
                          color: "#388e3c",
                          marginLeft: 8,
                        }}
                      >
                        • {m.player_name || m.player_id} — {m.gender || "?"},
                        age {m.age ?? "?"}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Failing members */}
                {analysis.failingMembers.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Roboto-SemiBold",
                        color: "#c62828",
                        marginBottom: 4,
                      }}
                    >
                      ✕ Non-qualifying members:
                    </Text>
                    {analysis.failingMembers.map((m) => (
                      <Text
                        key={m.player_id}
                        style={{
                          fontSize: 11,
                          fontFamily: "Roboto-Regular",
                          color: "#c62828",
                          marginLeft: 8,
                        }}
                      >
                        • {m.player_name || m.player_id} — {m.gender || "?"},
                        age {m.age ?? "?"}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            );
          })()}

          {/* No discount applied — optional discount flow */}
          {hasNoDiscount && availableOffers.length > 0 && (
            <View
              style={[
                styles.mismatchAlert,
                { backgroundColor: "#f3e5f5", marginBottom: 12 },
              ]}
            >
              <Text style={[styles.mismatchAlertText, { color: "#6a1b9a" }]}>
                ℹ No discount was applied at purchase. You may optionally apply
                one below.
              </Text>
              {!showNoDiscountOffers ? (
                <TouchableOpacity
                  style={{ marginTop: 8 }}
                  onPress={() => setShowNoDiscountOffers(true)}
                >
                  <Text
                    style={{
                      color: "#6a1b9a",
                      fontFamily: "Roboto-SemiBold",
                      fontSize: 13,
                    }}
                  >
                    View available discounts →
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ marginTop: 10 }}>
                  {availableOffers.map((offer: any) => {
                    const isEligible = isOfferEligible(
                      offer,
                      state.booking_amount || 0,
                    );
                    return (
                      <TouchableOpacity
                        key={offer.discount_id}
                        disabled={!isEligible}
                        style={[
                          styles.dropdownItem,
                          selectedNoDiscountOffer?.discount_id ===
                            offer.discount_id && styles.dropdownItemActive,
                          !isEligible && { opacity: 0.5 },
                          {
                            marginBottom: 6,
                            borderRadius: 8,
                            flexDirection: "column",
                            alignItems: "stretch",
                            paddingVertical: 10,
                          },
                        ]}
                        onPress={() => {
                          if (!isEligible) return;
                          setSelectedNoDiscountOffer(
                            selectedNoDiscountOffer?.discount_id ===
                              offer.discount_id
                              ? null
                              : offer,
                          );
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          <Text style={styles.dropdownItemId}>
                            {offer.discount_code}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#2e7d32",
                              fontFamily: "Roboto-Medium",
                            }}
                          >
                            {offer.discount_type === "percentage"
                              ? `-${offer.discount_value}%`
                              : `-₹${offer.discount_value}`}
                          </Text>
                        </View>
                        {!isEligible && (
                          <Text
                            style={{
                              color: "#c62828",
                              fontSize: 12,
                              fontWeight: "bold",
                              marginTop: 4,
                            }}
                          >
                            (⚠ Not eligible)
                          </Text>
                        )}
                        {offer.condition_summary && (
                          <View
                            style={{
                              marginTop: 8,
                              backgroundColor: "#fff8e1",
                              borderRadius: 6,
                              padding: 8,
                              borderLeftWidth: 3,
                              borderLeftColor: "#f9a825",
                              width: "100%",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontFamily: "Roboto-SemiBold",
                                color: "#e65100",
                                marginBottom: 4,
                              }}
                            >
                              ⚠ Verify these conditions:
                            </Text>
                            {offer.condition_summary.gender?.length > 0 && (
                              <Text style={styles.conditionRow}>
                                • Gender:{" "}
                                {offer.condition_summary.gender.join(", ")}
                              </Text>
                            )}
                            {offer.condition_summary.min_age != null &&
                              offer.condition_summary.max_age != null && (
                                <Text style={styles.conditionRow}>
                                  • Age: {offer.condition_summary.min_age}–
                                  {offer.condition_summary.max_age} yrs · Scope:{" "}
                                  {offer.condition_summary.condition_scope}
                                </Text>
                              )}
                            {offer.condition_summary.applicable_days?.length >
                              0 && (
                              <Text style={styles.conditionRow}>
                                • Valid days:{" "}
                                {offer.condition_summary.applicable_days.join(
                                  ", ",
                                )}
                              </Text>
                            )}
                            {offer.condition_summary.min_purchase_amt !=
                              null && (
                              <Text style={styles.conditionRow}>
                                • Min purchase: ₹
                                {offer.condition_summary.min_purchase_amt}
                              </Text>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {selectedNoDiscountOffer && (
                    <ActionButton
                      label={`Apply ${selectedNoDiscountOffer.discount_code} & Recalculate`}
                      onPress={() => {
                        if (!menuPackageId) {
                          Alert.alert(
                            "Error",
                            "Could not determine menu package.",
                          );
                          return;
                        }
                        Alert.alert(
                          "Apply Discount?",
                          `This will recalculate with ${selectedNoDiscountOffer.discount_code}. A benefit coupon will be issued for the difference.`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Apply",
                              onPress: () =>
                                handleApplyOffer(selectedNoDiscountOffer),
                            },
                          ],
                        );
                      }}
                      variant="primary"
                      loading={actionLoading}
                    />
                  )}
                </View>
              )}
            </View>
          )}

          {/* Better alternative discounts — shown when NO auto KYC mismatch detected and a discount IS applied */}
          {!hasNoDiscount &&
            autoMismatches.length === 0 &&
            (() => {
              const currentOfferId =
                state.discount_snapshot?.selected_offer?.discount_id;

              const betterOffers = availableOffers.filter(
                (offer: any) =>
                  offer.discount_id !== currentOfferId &&
                  offer.final_price_if_chosen != null &&
                  offer.final_price_if_chosen <=
                    (state.discount_snapshot?.original_price || 0),
              );
              if (betterOffers.length === 0) return null;
              return (
                <View
                  style={[
                    styles.mismatchAlert,
                    { backgroundColor: "#e8f5e9", marginBottom: 12 },
                  ]}
                >
                  <Text
                    style={[styles.mismatchAlertText, { color: "#2e7d32" }]}
                  >
                    ✓ No KYC mismatches detected. Better discount offers are
                    available — you may optionally apply one.
                  </Text>
                  {!showApplyOffer ? (
                    <TouchableOpacity
                      style={{ marginTop: 8 }}
                      onPress={() => setShowApplyOffer(true)}
                    >
                      <Text
                        style={{
                          color: "#2e7d32",
                          fontFamily: "Roboto-SemiBold",
                          fontSize: 13,
                        }}
                      >
                        View better discounts →
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ marginTop: 10 }}>
                      {betterOffers.map((offer: any) => {
                        const isSelected =
                          selectedAlternativeOffer?.discount_id ===
                          offer.discount_id;
                        const offerPrice = offer.final_price_if_chosen ?? 0;
                        const diffFromBooking = round2(
                          offerPrice - (state.booking_amount || 0),
                        );
                        const isEligible = isOfferEligible(
                          offer,
                          state.booking_amount || 0,
                        );
                        return (
                          <TouchableOpacity
                            key={offer.discount_id}
                            disabled={!isEligible}
                            style={[
                              styles.dropdownItem,
                              isSelected && styles.dropdownItemActive,
                              !isEligible && { opacity: 0.5 },
                              {
                                marginBottom: 6,
                                borderRadius: 8,
                                flexDirection: "column",
                                alignItems: "flex-start",
                                padding: 12,
                              },
                            ]}
                            onPress={() => {
                              if (!isEligible) return;
                              setSelectedAlternativeOffer(offer);
                              Alert.alert(
                                "Apply Better Offer?",
                                `Switch to ${offer.discount_code}? New price: ₹${offerPrice.toFixed(2)}. The old discount usage will be refunded automatically.`,
                                [
                                  {
                                    text: "Cancel",
                                    style: "cancel",
                                    onPress: () =>
                                      setSelectedAlternativeOffer(null),
                                  },
                                  {
                                    text: "Apply",
                                    onPress: () => handleApplyOffer(offer),
                                  },
                                ],
                              );
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                width: "100%",
                              }}
                            >
                              <Text style={styles.dropdownItemId}>
                                {offer.discount_code}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 13,
                                  color: "#2e7d32",
                                  fontFamily: "Roboto-SemiBold",
                                }}
                              >
                                {offer.discount_type === "percentage"
                                  ? `-${offer.discount_value}%`
                                  : `-₹${offer.discount_value}`}
                              </Text>
                            </View>
                            <Text
                              style={{
                                fontSize: 12,
                                fontFamily: "Roboto-Regular",
                                color: "#555",
                                marginTop: 2,
                              }}
                            >
                              Price if applied: ₹{offerPrice.toFixed(2)}
                              {"  "}
                              {!isEligible ? (
                                <Text
                                  style={{
                                    color: "#c62828",
                                    fontWeight: "bold",
                                  }}
                                >
                                  (⚠ Not eligible)
                                </Text>
                              ) : diffFromBooking < 0 ? (
                                <Text style={{ color: "#2e7d32" }}>
                                  (save ₹{Math.abs(diffFromBooking).toFixed(2)})
                                </Text>
                              ) : (
                                <Text style={{ color: "#00695c" }}>
                                  (exact match)
                                </Text>
                              )}
                            </Text>
                            {offer.condition_summary && (
                              <View
                                style={{
                                  marginTop: 6,
                                  backgroundColor: "#f5f5f5",
                                  borderRadius: 6,
                                  padding: 6,
                                  width: "100%",
                                }}
                              >
                                {offer.condition_summary.gender?.length > 0 && (
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      color: "#666",
                                      fontFamily: "Roboto-Regular",
                                    }}
                                  >
                                    Gender:{" "}
                                    {offer.condition_summary.gender.join(", ")}
                                  </Text>
                                )}
                                {offer.condition_summary.min_age != null &&
                                  offer.condition_summary.max_age != null && (
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        color: "#666",
                                        fontFamily: "Roboto-Regular",
                                      }}
                                    >
                                      Age: {offer.condition_summary.min_age}–
                                      {offer.condition_summary.max_age} yrs ·
                                      Scope:{" "}
                                      {offer.condition_summary.condition_scope}
                                    </Text>
                                  )}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })()}

          {/* Mismatch multi-select chips */}
          <Text style={styles.inlineFormLabel}>
            Flag mismatches (select all that apply):
          </Text>
          <View style={styles.chipRow}>
            {["gender", "age"].map((type) => {
              const isAuto = autoMismatches.includes(type);
              const isSelected = selectedMismatches.includes(type);
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    isSelected && styles.chipActive,
                    isAuto &&
                      !isSelected && {
                        borderColor: "#e65100",
                        borderWidth: 1.5,
                      },
                  ]}
                  onPress={() =>
                    setSelectedMismatches((prev) =>
                      prev.includes(type)
                        ? prev.filter((m) => m !== type)
                        : [...prev, type],
                    )
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextActive,
                    ]}
                  >
                    {type === "gender" ? "Gender Mismatch" : "Age Mismatch"}
                    {isAuto ? " ⚠" : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actionGap} />

          {/* Flag mismatches button — only shown if any selected */}
          {selectedMismatches.length > 0 && (
            <>
              <ActionButton
                label={`⚠ Flag ${selectedMismatches.join(" & ")} Mismatch`}
                onPress={() => handleVerifyKYC(selectedMismatches)}
                variant="warning"
                loading={actionLoading}
              />
              <View style={styles.actionGap} />
            </>
          )}

          {/* All good button — blocked when scope=all and members fail */}
          {(() => {
            const analysis = computeMismatchAnalysis();
            const blocked = analysis.shouldBlockVerify;
            return (
              <ActionButton
                label={
                  blocked
                    ? "✗ Cannot Verify — All members must match"
                    : "✓ KYC All Good — Verify"
                }
                onPress={() => {
                  if (!blocked) handleVerifyKYC([]);
                }}
                variant={blocked ? "danger" : "success"}
                loading={actionLoading}
                disabled={blocked}
              />
            );
          })()}
        </View>
      );
    }

    // ── KYC MISMATCH ──────────────────────────────────────────────────────
    if (ticket_status === "kyc_mismatch") {
      return (
        <View style={styles.actionPanel}>
          <SectionTitle title="KYC Mismatch — Recalculate" />
          <View style={[styles.mismatchAlert, { backgroundColor: "#fce4ec" }]}>
            <Text style={[styles.mismatchAlertText, { color: "#b71c1c" }]}>
              Mismatch type: {state.mismatch_type || "unknown"}
              {"\n"}Enter the player's actual details to recalculate the correct
              price.
            </Text>
          </View>

          {!showRecalcForm ? (
            <ActionButton
              label="Recalculate Price"
              onPress={() => setShowRecalcForm(true)}
              variant="warning"
            />
          ) : (
            renderRecalcForm()
          )}
        </View>
      );
    }

    if (ticket_status === "recalculated") {
      const extraRequired = round2(
        (state.recalculated_amount || 0) - (state.booking_amount || 0),
      );
      const benefitRequired = round2(
        (state.booking_amount || 0) - (state.recalculated_amount || 0),
      );
      const extraPending = state.extra_pending ?? extraRequired;
      const benefitPending = state.benefit_pending ?? benefitRequired;

      // Available alternative offers from recalculated_snapshot
      const offerAlreadyApplied =
        !!state.recalculated_snapshot?.selected_offer?.discount_id &&
        state.recalculated_snapshot?.applied_by_receptionist === true;

      const alternativeOffers: any[] = offerAlreadyApplied
        ? []
        : state.recalculated_snapshot?.available_offers || [];

      const originalOfferInvalidated =
        !offerAlreadyApplied &&
        state.recalculated_snapshot?.selected_offer === null &&
        !!state.recalculated_snapshot?.original_selected_offer;

      return (
        <View style={styles.actionPanel}>
          <SectionTitle title="Resolve Price Difference" />
          {renderPriceDiff()}

          {/* Running totals summary */}
          {extraRequired > 0 && (state.extra_collected_total || 0) > 0 && (
            <View
              style={[
                styles.mismatchAlert,
                { backgroundColor: "#e3f2fd", marginBottom: 10 },
              ]}
            >
              <Text style={[styles.mismatchAlertText, { color: "#1565c0" }]}>
                Collected so far: ₹{state.extra_collected_total?.toFixed(2)}
                {"\n"}
                Bucket applied: ₹
                {state.bucket_discount_total?.toFixed(2) || "0.00"}
                {"\n"}
                Still pending: ₹{extraPending.toFixed(2)}
              </Text>
            </View>
          )}
          {benefitRequired > 0 && (state.benefit_issued_total || 0) > 0 && (
            <View
              style={[
                styles.mismatchAlert,
                { backgroundColor: "#e8f5e9", marginBottom: 10 },
              ]}
            >
              <Text style={[styles.mismatchAlertText, { color: "#2e7d32" }]}>
                Benefit coupons issued: ₹
                {state.benefit_issued_total?.toFixed(2)}
                {"\n"}
                Yet to issue: ₹{benefitPending.toFixed(2)}
              </Text>
            </View>
          )}

          {/* Original offer invalidated banner */}
          {originalOfferInvalidated && (
            <View
              style={[
                styles.mismatchAlert,
                { backgroundColor: "#fce4ec", marginBottom: 10 },
              ]}
            >
              <Text style={[styles.mismatchAlertText, { color: "#b71c1c" }]}>
                ✕ Original discount (
                {state.recalculated_snapshot?.original_selected_offer
                  ?.discount_code || "N/A"}
                ) is no longer valid. Player must pay full price or choose an
                available offer below.
              </Text>
            </View>
          )}

          {/* Alternative offers section */}
          {alternativeOffers.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <Text
                style={[
                  styles.inlineFormLabel,
                  { color: "#4527a0", marginTop: 0 },
                ]}
              >
                Available alternative discounts:
              </Text>
              {alternativeOffers.map((offer: any) => {
                const isSelected =
                  selectedAlternativeOffer?.discount_id === offer.discount_id;
                const offerPrice = offer.final_price_if_chosen ?? 0;
                const diffFromBooking = round2(
                  offerPrice - (state.booking_amount || 0),
                );
                const isEligible = isOfferEligible(
                  offer,
                  state.booking_amount || 0,
                );
                return (
                  <TouchableOpacity
                    key={offer.discount_id}
                    disabled={!isEligible}
                    style={[
                      styles.dropdownItem,
                      isSelected && styles.dropdownItemActive,
                      !isEligible && { opacity: 0.5 },
                      {
                        marginBottom: 6,
                        borderRadius: 8,
                        flexDirection: "column",
                        alignItems: "flex-start",
                        padding: 12,
                      },
                    ]}
                    onPress={() => {
                      if (!isEligible) return;
                      setSelectedAlternativeOffer(offer);
                      Alert.alert(
                        "Apply Better Offer?",
                        `Switch to ${offer.discount_code}? New price: ₹${offerPrice.toFixed(2)}.`,
                        [
                          {
                            text: "Cancel",
                            style: "cancel",
                            onPress: () => setSelectedAlternativeOffer(null),
                          },
                          {
                            text: "Apply",
                            onPress: () => handleApplyOffer(offer),
                          },
                        ],
                      );
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      <Text style={styles.dropdownItemId}>
                        {offer.discount_code}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#2e7d32",
                          fontFamily: "Roboto-SemiBold",
                        }}
                      >
                        {offer.discount_type === "percentage"
                          ? `-${offer.discount_value}%`
                          : `-₹${offer.discount_value}`}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "Roboto-Regular",
                        color: "#555",
                        marginTop: 2,
                      }}
                    >
                      Price if applied: ₹{offerPrice.toFixed(2)}
                      {"  "}
                      {!isEligible ? (
                        <Text style={{ color: "#c62828", fontWeight: "bold" }}>
                          (⚠ Not eligible)
                        </Text>
                      ) : diffFromBooking > 0 ? (
                        <Text style={{ color: "#c62828" }}>
                          (collect ₹{diffFromBooking.toFixed(2)} extra)
                        </Text>
                      ) : diffFromBooking < 0 ? (
                        <Text style={{ color: "#2e7d32" }}>
                          (issue ₹{Math.abs(diffFromBooking).toFixed(2)} coupon)
                        </Text>
                      ) : (
                        <Text style={{ color: "#00695c" }}>(exact match)</Text>
                      )}
                    </Text>
                    {offer.condition_summary && (
                      <View
                        style={{
                          marginTop: 6,
                          backgroundColor: "#f5f5f5",
                          borderRadius: 6,
                          padding: 6,
                          width: "100%",
                        }}
                      >
                        {offer.condition_summary.gender?.length > 0 && (
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#666",
                              fontFamily: "Roboto-Regular",
                            }}
                          >
                            Gender: {offer.condition_summary.gender.join(", ")}
                          </Text>
                        )}
                        {offer.condition_summary.min_age != null &&
                          offer.condition_summary.max_age != null && (
                            <Text
                              style={{
                                fontSize: 11,
                                color: "#666",
                                fontFamily: "Roboto-Regular",
                              }}
                            >
                              Age: {offer.condition_summary.min_age}–
                              {offer.condition_summary.max_age} yrs · Scope:{" "}
                              {offer.condition_summary.condition_scope}
                            </Text>
                          )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Divider between offer selection and payment actions */}
          {alternativeOffers.length > 0 &&
            (extraRequired > 0 || benefitRequired > 0) && (
              <View
                style={{
                  height: 1,
                  backgroundColor: "#e0e0e0",
                  marginVertical: 12,
                }}
              />
            )}

          {/* Collect extra / issue coupon / bucket — unchanged logic */}
          {extraRequired > 0 && extraPending > 0 ? (
            <>
              {!showCollectExtra ? (
                <ActionButton
                  label={`Collect Extra Payment (₹${extraPending.toFixed(2)} pending)`}
                  onPress={() => {
                    setCollectExtraAmount(extraPending.toFixed(2));
                    setShowCollectExtra(true);
                  }}
                  variant="warning"
                />
              ) : (
                renderCollectExtraForm(extraPending)
              )}
            </>
          ) : benefitRequired > 0 && benefitPending > 0 ? (
            <>
              {!showIssueCoupon ? (
                <ActionButton
                  label={`Issue Benefit Coupon (₹${benefitPending.toFixed(2)} pending)`}
                  onPress={() => {
                    setCouponValue(benefitPending.toFixed(2));
                    setShowIssueCoupon(true);
                  }}
                  variant="primary"
                />
              ) : (
                renderIssueCouponForm(benefitPending)
              )}
            </>
          ) : extraPending === 0 && benefitPending === 0 ? (
            !showDeclineForm ? (
              <>
                <ActionButton
                  label="✓ Final Approve"
                  onPress={handleApprove}
                  variant="success"
                  loading={actionLoading}
                />
                <View style={styles.actionGap} />
                <ActionButton
                  label="Decline Ticket"
                  onPress={() => setShowDeclineForm(true)}
                  variant="danger"
                />
              </>
            ) : (
              renderDeclineForm()
            )
          ) : null}

          <View style={styles.actionGap} />

          {extraRequired > 0 && extraPending > 0 && (
            <>
              {!showBucket ? (
                <ActionButton
                  label="Apply Receptionist Bucket Discount"
                  onPress={() => {
                    setBucketAmount(extraPending.toFixed(2));
                    setShowBucket(true);
                  }}
                  variant="outline"
                />
              ) : (
                renderBucketForm(extraPending)
              )}
            </>
          )}
        </View>
      );
    }

    if (ticket_status === "resolved" || ticket_status === "kyc_verified") {
      return (
        <View style={styles.actionPanel}>
          <SectionTitle title="Final Approval" />

          {!showDeclineForm ? (
            <>
              <ActionButton
                label="✓ Final Approve"
                onPress={handleApprove}
                variant="success"
                loading={actionLoading}
              />
              <View style={styles.actionGap} />
              <ActionButton
                label="Decline Ticket"
                onPress={() => setShowDeclineForm(true)}
                variant="danger"
              />
            </>
          ) : (
            renderDeclineForm()
          )}
        </View>
      );
    }

    // ── APPROVED ───────────────────────────────────────────────────────────
    if (ticket_status === "approved") {
      return (
        <View style={[styles.actionPanel, styles.approvedPanel]}>
          <Text style={styles.approvedIcon}>✓</Text>
          <Text style={styles.approvedTitle}>Ticket Approved</Text>
          <Text style={styles.approvedSubtitle}>
            Player is verified and cleared to play.
          </Text>
          {state.performance_ids?.length > 0 && (
            <View style={styles.perfList}>
              <Text style={styles.perfListTitle}>Performance IDs Created:</Text>
              {state.performance_ids.map((pid) => (
                <Text key={pid} style={styles.perfId}>
                  • {pid}
                </Text>
              ))}
            </View>
          )}
        </View>
      );
    }

    // ── DECLINED ───────────────────────────────────────────────────────────
    if (ticket_status === "declined") {
      const lastDecline = state.audit_log
        ?.filter((e) => e.action === "declined")
        .pop();
      return (
        <View style={[styles.actionPanel, styles.declinedPanel]}>
          <Text style={styles.declinedIcon}>✕</Text>
          <Text style={styles.declinedTitle}>Ticket Declined</Text>
          {lastDecline?.notes && (
            <Text style={styles.declinedReason}>
              Reason: {lastDecline.notes}
            </Text>
          )}
        </View>
      );
    }

    return null;
  };

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.container}>
        <AppBar
          title="Ticket Approval"
          titleFontWeight="bold"
          onMenuPress={() => {}}
          logoSource={require("../assets/images/tehologo.png")}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading ticket state…</Text>
        </View>
      </View>
    );
  }

  if (!state) {
    return (
      <View style={styles.container}>
        <AppBar
          title="Ticket Approval"
          onMenuPress={() => {}}
          logoSource={require("../assets/images/tehologo.png")}
        />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load ticket.</Text>
          <ActionButton label="Retry" onPress={fetchState} />
        </View>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <AppBar
        title="Ticket Approval"
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status header */}
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.ticketIdText}>{state.ticket_id}</Text>
              <Text style={styles.phoneText}>{state.bought_by}</Text>
            </View>
            <StatusBadge status={state.ticket_status} />
          </View>

          {/* Player info */}
          {state.team_players && state.team_players.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Team Players ({state.team_players.length})
              </Text>
              {state.team_players.map((member, idx) => (
                <View
                  key={member.player_id}
                  style={{
                    marginBottom: idx < state.team_players.length - 1 ? 12 : 0,
                    paddingBottom: idx < state.team_players.length - 1 ? 12 : 0,
                    borderBottomWidth:
                      idx < state.team_players.length - 1 ? 1 : 0,
                    borderBottomColor: "#f0f0f0",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Roboto-SemiBold",
                      color: "#888",
                      marginBottom: 4,
                    }}
                  >
                    {idx === 0 ? "TEAM LEADER" : `MEMBER ${idx + 1}`}
                  </Text>
                  <InfoRow label="Name" value={member.player_name || "—"} />
                  <InfoRow label="Gender" value={member.gender || "—"} />
                  <InfoRow label="DOB" value={dobToString(member.dob)} />
                  <InfoRow
                    label="Age"
                    value={member.age != null ? `${member.age} yrs` : "—"}
                  />
                </View>
              ))}
              {state.kyc_corrected && (
                <View style={styles.kycCorrectedBadge}>
                  <Text style={styles.kycCorrectedText}>KYC Corrected ✓</Text>
                </View>
              )}
            </View>
          ) : state.player ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Player</Text>
              <InfoRow label="Name" value={state.player.player_name || "—"} />
              <InfoRow label="Gender" value={state.player.gender || "—"} />
              <InfoRow label="DOB" value={dobToString(state.player.dob)} />
              {state.kyc_corrected && (
                <View style={styles.kycCorrectedBadge}>
                  <Text style={styles.kycCorrectedText}>KYC Corrected ✓</Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Discount snapshot */}
          {state?.discount_snapshot?.original_price != null && (
            <View style={styles.discountCard}>
              <Text style={styles.discountCardTitle}>
                🏷️ Discount at Purchase
              </Text>

              <View style={styles.offerRow}>
                <Text style={styles.infoLabel}>Base Price</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { textDecorationLine: "line-through", color: "#888" },
                  ]}
                >
                  ₹
                  {state.per_ticket_entry
                    ? state.per_ticket_entry.base_price
                    : state.discount_snapshot.original_price}
                </Text>
              </View>

              {state.discount_snapshot.selected_offer?.discount_id ? (
                <>
                  {/* Offer code + rate + optional max-discount badge */}
                  <View style={styles.offerRow}>
                    <Text style={styles.offerCode}>
                      {state.discount_snapshot.selected_offer.discount_code}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {(() => {
                        if (
                          state.discount_snapshot.selected_offer
                            .discount_type !== "percentage"
                        ) {
                          return null;
                        }

                        const orderTotal =
                          state.discount_snapshot.original_price;
                        const rawCalc = parseFloat(
                          (
                            (state.discount_snapshot.selected_offer
                              .discount_value /
                              100) *
                            orderTotal
                          ).toFixed(2),
                        );

                        const applied =
                          state.discount_snapshot.selected_offer
                            .applied_discount_amount;

                        const isCapped = Math.abs(rawCalc - applied) > 0.5;

                        return isCapped ? (
                          <View
                            style={{
                              backgroundColor: "#fff3e0",
                              borderRadius: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontFamily: "Roboto-SemiBold",
                                color: "#e65100",
                              }}
                            >
                              Max discount applied
                            </Text>
                          </View>
                        ) : null;
                      })()}
                      {(() => {
                        const offer = state.discount_snapshot.selected_offer;

                        if (offer.discount_type === "percentage") {
                          const orderTotal =
                            state.discount_snapshot.original_price;

                          const rawCalc = parseFloat(
                            ((offer.discount_value / 100) * orderTotal).toFixed(
                              2,
                            ),
                          );

                          const applied = offer.applied_discount_amount;

                          const isCapped = Math.abs(rawCalc - applied) > 0.5;

                          if (isCapped) {
                            return null;
                          }
                        }

                        return (
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: "Roboto-Regular",
                              color: "#c62828",
                            }}
                          >
                            {offer.discount_type === "percentage"
                              ? `-${offer.discount_value}%`
                              : `-₹${offer.discount_value}`}
                          </Text>
                        );
                      })()}
                    </View>
                  </View>

                  {/* Ticket base price */}

                  {/* Discount amount */}
                  <View style={styles.offerRow}>
                    <Text style={styles.infoLabel}>Discount</Text>
                    <Text style={[styles.infoValue, { color: "#c62828" }]}>
                      -₹
                      {state.per_ticket_entry
                        ? state.per_ticket_entry.discount_share
                        : state.discount_snapshot.selected_offer
                            .applied_discount_amount}
                    </Text>
                  </View>

                  {/* Amount paid */}
                  <View style={styles.offerRow}>
                    <Text
                      style={[
                        styles.infoLabel,
                        { fontFamily: "Roboto-SemiBold", color: "#333" },
                      ]}
                    >
                      Amount paid
                    </Text>
                    <Text
                      style={[
                        styles.infoValue,
                        { color: "#2e7d32", fontFamily: "Roboto-SemiBold" },
                      ]}
                    >
                      ₹
                      {state.per_ticket_entry
                        ? state.per_ticket_entry.final_price
                        : state.discount_snapshot.selected_offer
                            .final_price_if_chosen}
                    </Text>
                  </View>

                  {state.discount_snapshot.selected_offer.condition_summary && (
                    <View style={styles.conditionBox}>
                      <Text style={styles.conditionBoxTitle}>
                        ⚠ Verify these conditions match the player:
                      </Text>
                      {state.discount_snapshot.selected_offer.condition_summary
                        .gender?.length > 0 && (
                        <Text style={styles.conditionRow}>
                          • Gender:{" "}
                          {state.discount_snapshot.selected_offer.condition_summary.gender.join(
                            ", ",
                          )}
                        </Text>
                      )}
                      {state.discount_snapshot.selected_offer.condition_summary
                        .min_age != null &&
                        state.discount_snapshot.selected_offer.condition_summary
                          .max_age != null && (
                          <Text style={styles.conditionRow}>
                            • Age:{" "}
                            {
                              state.discount_snapshot.selected_offer
                                .condition_summary.min_age
                            }
                            –
                            {
                              state.discount_snapshot.selected_offer
                                .condition_summary.max_age
                            }{" "}
                            years
                          </Text>
                        )}
                      {state.discount_snapshot.selected_offer.condition_summary
                        .applicable_days?.length > 0 && (
                        <Text style={styles.conditionRow}>
                          • Valid days:{" "}
                          {state.discount_snapshot.selected_offer.condition_summary.applicable_days.join(
                            ", ",
                          )}
                        </Text>
                      )}
                      {state.discount_snapshot.selected_offer.condition_summary
                        .min_purchase_amt != null && (
                        <Text style={styles.conditionRow}>
                          • Min purchase: ₹
                          {
                            state.discount_snapshot.selected_offer
                              .condition_summary.min_purchase_amt
                          }
                        </Text>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.noDiscount}>
                  No discount applied — full price paid
                </Text>
              )}
            </View>
          )}

          {/* Status timeline */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Status Timeline</Text>
            {state.status_history.map((entry, i) => (
              <View key={i} style={styles.timelineRow}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor:
                        i === state.status_history.length - 1
                          ? "#2d7a2d"
                          : "#ccc",
                    },
                  ]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>
                    {statusLabel(entry.status).label}
                  </Text>
                  <Text style={styles.timelineTime}>
                    {tsToString(entry.timestamp)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Action panel — status-driven */}
          {renderActionPanel()}

          {/* Audit trail */}
          {renderAuditTrail()}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: "Roboto-Regular",
    color: "#666",
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Roboto-Regular",
    color: "#c62828",
    marginBottom: 16,
  },

  // Status header
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ebebeb",
  },
  ticketIdText: {
    fontSize: 12,
    fontFamily: "Roboto-Regular",
    color: "#888",
    marginBottom: 2,
  },
  phoneText: {
    fontSize: 17,
    fontFamily: "Roboto-SemiBold",
    color: "#222",
  },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Roboto-SemiBold",
    letterSpacing: 0.3,
  },

  // Cards
  card: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ebebeb",
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: "Roboto-SemiBold",
    color: "#888",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: "Roboto-Regular",
    color: "#888",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Roboto-Medium",
    color: "#222",
    flex: 2,
    textAlign: "right",
  },

  // Section title
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  sectionTitleText: {
    fontSize: 12,
    fontFamily: "Roboto-SemiBold",
    color: "#888",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionTitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e8e8e8",
  },

  // Action panel
  actionPanel: {
    backgroundColor: "#fafafa",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  actionPanelHint: {
    fontSize: 13,
    fontFamily: "Roboto-Regular",
    color: "#666",
    marginBottom: 14,
    lineHeight: 20,
  },
  actionGap: { height: 10 },

  // Action button
  actionButton: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: "Roboto-SemiBold",
    letterSpacing: 0.2,
  },

  // Mismatch alert
  mismatchAlert: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  mismatchAlertText: {
    fontSize: 13,
    fontFamily: "Roboto-Regular",
    lineHeight: 20,
  },

  // Price diff
  priceDiffCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  priceDiffTitle: {
    fontSize: 12,
    fontFamily: "Roboto-SemiBold",
    color: "#888",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  priceDiffRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 10,
  },
  priceDiffItem: { alignItems: "center" },
  priceDiffLabel: {
    fontSize: 12,
    fontFamily: "Roboto-Regular",
    color: "#888",
    marginBottom: 4,
  },
  priceDiffAmount: {
    fontSize: 20,
    fontFamily: "Roboto-SemiBold",
    color: "#222",
  },
  priceDiffArrow: {
    fontSize: 20,
    color: "#aaa",
  },
  priceDiffResult: {
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  priceDiffResultText: {
    fontSize: 14,
    fontFamily: "Roboto-SemiBold",
  },

  // Inline forms
  inlineForm: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginTop: 10,
  },
  inlineFormTitle: {
    fontSize: 14,
    fontFamily: "Roboto-SemiBold",
    color: "#333",
    marginBottom: 12,
  },
  inlineFormLabel: {
    fontSize: 13,
    fontFamily: "Roboto-Medium",
    color: "#555",
    marginTop: 10,
    marginBottom: 6,
  },
  inlineInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Roboto-Regular",
    color: "#222",
    backgroundColor: "#fafafa",
  },
  inlineFormButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },

  // Chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
  chipActive: {
    backgroundColor: "#2d7a2d",
    borderColor: "#2d7a2d",
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Roboto-Medium",
    color: "#555",
  },
  chipTextActive: { color: "#fff" },

  // DOB
  dobButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  dobButtonText: {
    fontSize: 15,
    fontFamily: "Roboto-Regular",
    color: "#222",
  },
  dobPlaceholder: { color: "#aaa" },

  // Timeline
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
    marginRight: 10,
  },
  timelineContent: { flex: 1 },
  timelineStatus: {
    fontSize: 14,
    fontFamily: "Roboto-Medium",
    color: "#333",
  },
  timelineTime: {
    fontSize: 12,
    fontFamily: "Roboto-Regular",
    color: "#888",
    marginTop: 1,
  },

  // KYC corrected
  kycCorrectedBadge: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  kycCorrectedText: {
    fontSize: 12,
    fontFamily: "Roboto-SemiBold",
    color: "#2e7d32",
  },

  // Approved / declined panels
  approvedPanel: {
    backgroundColor: "#e8f5e9",
    borderColor: "#c8e6c9",
    alignItems: "center",
    paddingVertical: 24,
  },
  approvedIcon: { fontSize: 48, marginBottom: 8 },
  approvedTitle: {
    fontSize: 20,
    fontFamily: "Roboto-SemiBold",
    color: "#1b5e20",
    marginBottom: 4,
  },
  approvedSubtitle: {
    fontSize: 14,
    fontFamily: "Roboto-Regular",
    color: "#388e3c",
    marginBottom: 16,
    textAlign: "center",
  },
  perfList: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    width: "100%",
  },
  perfListTitle: {
    fontSize: 12,
    fontFamily: "Roboto-SemiBold",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  perfId: {
    fontSize: 13,
    fontFamily: "Roboto-Regular",
    color: "#333",
    paddingVertical: 2,
  },
  declinedPanel: {
    backgroundColor: "#ffebee",
    borderColor: "#ffcdd2",
    alignItems: "center",
    paddingVertical: 24,
  },
  declinedIcon: { fontSize: 48, marginBottom: 8 },
  declinedTitle: {
    fontSize: 20,
    fontFamily: "Roboto-SemiBold",
    color: "#b71c1c",
    marginBottom: 8,
  },
  declinedReason: {
    fontSize: 14,
    fontFamily: "Roboto-Regular",
    color: "#c62828",
    textAlign: "center",
  },

  // Audit trail
  auditCard: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ebebeb",
  },
  auditEntry: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#bbb",
    marginTop: 5,
    marginRight: 10,
  },
  auditContent: { flex: 1 },
  auditAction: {
    fontSize: 13,
    fontFamily: "Roboto-SemiBold",
    color: "#333",
  },
  auditTime: {
    fontSize: 11,
    fontFamily: "Roboto-Regular",
    color: "#aaa",
    marginTop: 1,
  },
  auditNotes: {
    fontSize: 12,
    fontFamily: "Roboto-Regular",
    color: "#666",
    marginTop: 3,
    fontStyle: "italic",
  },
  auditDetail: {
    fontSize: 12,
    fontFamily: "Roboto-Medium",
    color: "#555",
    marginTop: 3,
  },
  kycChangesBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
  },
  kycChangeText: {
    fontSize: 11,
    fontFamily: "Roboto-Regular",
    color: "#555",
    paddingVertical: 1,
  },

  // Discount card
  discountCard: {
    backgroundColor: "#fffde7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fff59d",
  },
  discountCardTitle: {
    fontSize: 13,
    fontFamily: "Roboto-SemiBold",
    color: "#f57f17",
    marginBottom: 10,
  },
  offerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#fff9c4",
  },
  offerCode: {
    fontSize: 13,
    fontFamily: "Roboto-SemiBold",
    color: "#555",
  },
  offerPrice: {
    fontSize: 13,
    fontFamily: "Roboto-SemiBold",
    color: "#333",
  },
  noDiscount: {
    fontSize: 13,
    fontFamily: "Roboto-Regular",
    color: "#aaa",
    fontStyle: "italic",
  },
  conditionBox: {
    backgroundColor: "#fff8e1",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#f9a825",
  },
  conditionBoxTitle: {
    fontSize: 12,
    fontFamily: "Roboto-SemiBold",
    color: "#e65100",
    marginBottom: 6,
  },
  conditionRow: {
    fontSize: 12,
    fontFamily: "Roboto-Regular",
    color: "#555",
    paddingVertical: 2,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  dropdownItemActive: {
    backgroundColor: "#f0faf0",
    borderColor: "#2d7a2d",
  },
  dropdownItemId: {
    fontSize: 13,
    fontFamily: "Roboto-Medium",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
});
