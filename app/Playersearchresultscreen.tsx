import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
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

interface TicketData {
  ticket_id: string;
  ticket_status: string;
  bought_by: string;
  tournament_id: string;
  menu_package_id: string;
  instance_ids: string[];
  booking_amount: number;
  discount_snapshot: any;
  is_registered: boolean;
  player_registered: boolean;
  player: PlayerData | null;
  team_name: string | null;
  is_team_ticket: boolean;
  original_buyer_phone: string | null;
}

interface PlayerData {
  player_id: string;
  player_name: string;
  gender: string;
  dob: number;
  email: string;
  gamer_tag: string;
  photo: string | null;
  profile_updated?: boolean;
}

type ScreenState =
  | "loading"
  | "no_ticket_no_player" // → existing RegistrationPage
  | "no_ticket_has_player" // edge case
  | "ticket_no_player" // → VenueRegistrationScreen
  | "ticket_has_player" // → show KYC + mark arrived + approval
  | "error";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dobToString(dob: number | null | undefined): string {
  if (!dob) return "Not set";
  const d = new Date(dob * 1000);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, { bg: string; text: string; label: string }> =
    {
      purchased: { bg: "#fff3e0", text: "#e65100", label: "Purchased" },
      arrived: { bg: "#e3f2fd", text: "#1565c0", label: "Arrived" },
      kyc_verified: { bg: "#e8f5e9", text: "#2e7d32", label: "KYC Verified" },
      kyc_mismatch: { bg: "#fce4ec", text: "#b71c1c", label: "KYC Mismatch" },
      recalculated: { bg: "#ede7f6", text: "#4527a0", label: "Recalculated" },
      resolved: { bg: "#e0f2f1", text: "#00695c", label: "Resolved" },
      approved: { bg: "#e8f5e9", text: "#1b5e20", label: "Approved ✓" },
      declined: { bg: "#ffebee", text: "#c62828", label: "Declined" },
    };
  const style = colorMap[status] || {
    bg: "#f5f5f5",
    text: "#555",
    label: status,
  };
  return (
    <View style={[statusStyles.badge, { backgroundColor: style.bg }]}>
      <Text style={[statusStyles.badgeText, { color: style.text }]}>
        {style.label}
      </Text>
    </View>
  );
}

const statusStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Roboto-SemiBold",
    letterSpacing: 0.3,
  },
});

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "—"}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function PlayerSearchResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string }>();
  const { staffInfo, tournamentId } = useTournament();

  const phone = Array.isArray(params.phone) ? params.phone[0] : params.phone;

  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [allTickets, setAllTickets] = useState<TicketData[]>([]);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [ticketDropdownOpen, setTicketDropdownOpen] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [markArrivedLoading, setMarkArrivedLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ── Fetch both ticket and player on mount ──────────────────────────────

  useFocusEffect(
    useCallback(() => {
      if (!phone) {
        setScreenState("error");
        setErrorMessage("No phone number provided.");
        return;
      }
      fetchData();
    }, [phone]),
  );

  const fetchData = async () => {
    setScreenState("loading");
    try {
      // Both calls in parallel
      const [ticketRes, playerRes] = await Promise.allSettled([
        fetch(
          `${BASE_URL}/api/our-tickets/all-by-phone/${encodeURIComponent(phone)}?tournament_id=${tournamentId}`,
        ),
        fetch(
          `${BASE_URL}/api/player/${encodeURIComponent(phone)}/?player_id_or_phone=${encodeURIComponent(phone)}`,
        ),
      ]);

      const ticketOk = ticketRes.status === "fulfilled" && ticketRes.value.ok;
      const playerOk = playerRes.status === "fulfilled" && playerRes.value.ok;

      let tickets: TicketData[] = [];
      let ticket: TicketData | null = null;
      let player: PlayerData | null = null;

      if (ticketOk) {
        const data = await (
          ticketRes as PromiseFulfilledResult<Response>
        ).value.json();
        // API returns an array
        const arr: any[] = Array.isArray(data) ? data : [];
        tickets = arr.map((t) => ({
          ticket_id: t.our_ticket_id,
          ticket_status: t.ticket_status,
          bought_by: t.bought_by,
          tournament_id: t.tournament_id,
          menu_package_id: t.menu_package_id,
          instance_ids: t.instance_ids || [],
          booking_amount: t.booking_amount,
          discount_snapshot: t.discount_snapshot,
          is_registered: t.is_registered,
          player_registered: false,
          player: null,
          team_name: t.team_name || null,
          is_team_ticket: t.is_team_ticket || false,
          original_buyer_phone: t.original_buyer_phone || null,
        }));
        // Auto-select: prefer first unregistered ticket, fallback to first ticket
        const unregistered = tickets.find((t) => !t.is_registered);
        ticket = unregistered || tickets[0];
      }

      if (playerOk) {
        const data = await (
          playerRes as PromiseFulfilledResult<Response>
        ).value.json();
        if (data.player_id) {
          player = {
            player_id: data.player_id,
            player_name: data.name || data.player_name,
            gender: data.gender,
            dob: data.dob,
            email: data.email,
            gamer_tag: data.gamer_tag,
            photo: data.photo,
            profile_updated: data.profile_updated || false,
          };

          // Also fetch tickets where this player is a member but not the buyer
          try {
            const memberTicketRes = await fetch(
              `${BASE_URL}/api/our-tickets/all-by-player/${data.player_id}?tournament_id=${tournamentId}`,
            );
            if (memberTicketRes.ok) {
              const memberData = await memberTicketRes.json();
              const memberArr: any[] = Array.isArray(memberData)
                ? memberData
                : [];
              const memberTickets: TicketData[] = memberArr
                .filter(
                  (t) =>
                    !tickets.some(
                      (existing) => existing.ticket_id === t.our_ticket_id,
                    ),
                )
                .map((t) => ({
                  ticket_id: t.our_ticket_id,
                  ticket_status: t.ticket_status,
                  bought_by: t.bought_by,
                  tournament_id: t.tournament_id,
                  menu_package_id: t.menu_package_id,
                  instance_ids: t.instance_ids || [],
                  booking_amount: t.booking_amount,
                  discount_snapshot: t.discount_snapshot,
                  is_registered: t.is_registered,
                  player_registered: false,
                  player: null,
                  team_name: t.team_name || null,
                  is_team_ticket: t.is_team_ticket || false,
                  original_buyer_phone: t.original_buyer_phone || null,
                }));
              tickets = [...tickets, ...memberTickets];
            }
          } catch {
            // non-fatal
          }

          // Re-run auto-select after member tickets are merged
          if (!ticket && tickets.length > 0) {
            const unregisteredMember = tickets.find((t) => !t.is_registered);
            ticket = unregisteredMember || tickets[0];
          }
        }
      }

      setAllTickets(tickets);
      setTicketData(ticket);
      setPlayerData(player);

      // Determine state
      if (tickets.length === 0 && !player) {
        setScreenState("no_ticket_no_player");
      } else if (tickets.length === 0 && player) {
        setScreenState("no_ticket_has_player");
      } else if (tickets.length > 0 && !player) {
        setScreenState("ticket_no_player");
      } else if (tickets.length > 0 && tickets.every((t) => !t.is_registered)) {
        // All tickets unregistered and player exists — still need venue registration
        setScreenState("ticket_no_player");
      } else {
        // At least one registered ticket and player exists
        setScreenState("ticket_has_player");
      }
    } catch (err) {
      console.error("PlayerSearchResult fetch error:", err);
      setScreenState("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  // ── Mark Arrived ───────────────────────────────────────────────────────

  const handleMarkArrived = async () => {
    if (!ticketData) return;

    const token = await AsyncStorage.getItem("staff_token");
    const payload = token ? parseJwt(token) : null;
    const receptionistId = payload?.staff_id || staffInfo?.staff_id;

    if (!receptionistId) {
      Alert.alert("Error", "Could not identify receptionist. Please re-login.");
      return;
    }

    setMarkArrivedLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/ticket-approval/${ticketData.ticket_id}/mark-arrived`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receptionist_id: receptionistId }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        Alert.alert("Error", err.detail || "Failed to mark arrived.");
        return;
      }

      showToast("Marked as arrived. Proceeding to approval.");
      router.push({
        pathname: "/Ticketapprovalscreen",
        params: { ticket_id: ticketData.ticket_id },
      });
    } catch (err) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setMarkArrivedLoading(false);
    }
  };

  // ── Go to approval (already arrived or further) ────────────────────────

  const handleGoToApproval = () => {
    if (!ticketData) return;
    router.push({
      pathname: "/Ticketapprovalscreen",
      params: { ticket_id: ticketData.ticket_id },
    });
  };

  // ── Renders ────────────────────────────────────────────────────────────

  if (screenState === "loading") {
    return (
      <View style={styles.container}>
        <AppBar
          title="Player Search"
          onMenuPress={() => {}}
          logoSource={require("../assets/images/tehologo.png")}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Looking up {phone}…</Text>
        </View>
      </View>
    );
  }

  if (screenState === "error") {
    return (
      <View style={styles.container}>
        <AppBar
          title="Player Search"
          onMenuPress={() => {}}
          logoSource={require("../assets/images/tehologo.png")}
        />
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── State: no ticket, no player → existing registration flow ──────────
  if (screenState === "no_ticket_no_player") {
    return (
      <View style={styles.container}>
        <AppBar
          title="Player Search"
          onMenuPress={() => {}}
          logoSource={require("../assets/images/tehologo.png")}
        />
        <View style={styles.centered}>
          <Text style={styles.bigIcon}>👤</Text>
          <Text style={styles.stateTitle}>No Record Found</Text>
          <Text style={styles.stateSubtitle}>
            No ticket and no registration found for{"\n"}
            <Text style={styles.phoneHighlight}>{phone}</Text>
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/RegistartionPage")}
          >
            <Text style={styles.primaryButtonText}>Register New Player</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backLinkText}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── State: no ticket, has player → edge case ──────────────────────────
  if (screenState === "no_ticket_has_player") {
    return (
      <View style={styles.container}>
        <AppBar
          title="Player Search"
          onMenuPress={() => {}}
          logoSource={require("../assets/images/tehologo.png")}
        />
        <View style={styles.centered}>
          <Text style={styles.bigIcon}>🎫</Text>
          <Text style={styles.stateTitle}>No Ticket Found</Text>
          <Text style={styles.stateSubtitle}>
            Player exists but has not purchased a ticket yet.{"\n"}
            Ask them to buy a ticket at the counter or online.
          </Text>
          {playerData && (
            <View style={styles.playerPillSmall}>
              <Text style={styles.playerPillName}>
                {playerData.player_name}
              </Text>
              <Text style={styles.playerPillPhone}>{phone}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backLinkText}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── State: ticket found, no player → venue registration ───────────────
  if (screenState === "ticket_no_player") {
    return (
      <View style={styles.container}>
        <AppBar
          title="Player Search"
          onMenuPress={() => {}}
          logoSource={require("../assets/images/tehologo.png")}
        />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.stateCard}>
            <Text style={styles.bigIcon}>📋</Text>
            <Text style={styles.stateTitle}>Ticket Found</Text>
            <Text style={styles.stateSubtitle}>
              Player has not registered yet. Register them at the venue to
              proceed.
            </Text>
          </View>

          {/* Ticket selector */}
          {allTickets.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Select Ticket</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setTicketDropdownOpen((v) => !v)}
              >
                <Text style={styles.dropdownSelectorText}>
                  {ticketData ? ticketData.ticket_id : "Choose a ticket…"}
                </Text>
                <Text style={styles.dropdownChevron}>
                  {ticketDropdownOpen ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>
              {ticketDropdownOpen && (
                <View style={styles.dropdownList}>
                  {allTickets.map((t) => (
                    <TouchableOpacity
                      key={t.ticket_id}
                      style={[
                        styles.dropdownItem,
                        ticketData?.ticket_id === t.ticket_id &&
                          styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setTicketData(t);
                        setTicketDropdownOpen(false);
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.dropdownItemId}>{t.ticket_id}</Text>
                        {t.is_team_ticket && (
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#7b1fa2",
                              fontFamily: "Roboto-Regular",
                            }}
                          >
                            {t.team_name
                              ? `Team: ${t.team_name}`
                              : "Team Ticket"}
                          </Text>
                        )}
                        {t.original_buyer_phone &&
                          t.original_buyer_phone !== phone && (
                            <Text
                              style={{
                                fontSize: 10,
                                color: "#888",
                                fontFamily: "Roboto-Regular",
                              }}
                            >
                              Bought by: {t.original_buyer_phone}
                            </Text>
                          )}
                        {/* Registration badge */}
                        <View
                          style={{
                            marginTop: 3,
                            alignSelf: "flex-start",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                            backgroundColor: t.is_registered
                              ? "#e8f5e9"
                              : "#fff3e0",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontFamily: "Roboto-SemiBold",
                              color: t.is_registered ? "#2e7d32" : "#e65100",
                            }}
                          >
                            {t.is_registered
                              ? "✓ Registered"
                              : "⚠ Not Registered"}
                          </Text>
                        </View>
                      </View>
                      <StatusBadge status={t.ticket_status} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Ticket summary */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ticket Details</Text>
            <InfoRow label="Ticket ID" value={ticketData?.ticket_id || "—"} />
            <InfoRow label="Phone" value={phone} />
            {ticketData?.is_team_ticket && (
              <InfoRow
                label="Team Name"
                value={ticketData?.team_name || "Not set"}
              />
            )}
            {ticketData?.original_buyer_phone &&
              ticketData.original_buyer_phone !== phone && (
                <InfoRow
                  label="Original Buyer"
                  value={ticketData.original_buyer_phone}
                />
              )}
            <InfoRow
              label="Type"
              value={ticketData?.is_team_ticket ? "Team Ticket" : "Solo Ticket"}
            />
            <InfoRow
              label="Amount Paid"
              value={
                ticketData?.booking_amount
                  ? `₹${ticketData.booking_amount}`
                  : "—"
              }
            />
            <InfoRow
              label="Activities"
              value={`${ticketData?.instance_ids?.length || 0} activity slot(s)`}
            />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <StatusBadge status={ticketData?.ticket_status || "purchased"} />
            </View>
          </View>

          {/* Discount snapshot if any */}
          {ticketData?.discount_snapshot?.selected_offer?.discount_id && (
            <View style={styles.discountCard}>
              <Text style={styles.discountCardTitle}>
                🏷️ Discount Applied at Purchase
              </Text>
              <View style={styles.offerRow}>
                <Text style={styles.offerCode}>
                  {ticketData.discount_snapshot.selected_offer.discount_code}
                </Text>
                <Text style={styles.offerPrice}>
                  -
                  {ticketData.discount_snapshot.selected_offer.discount_type ===
                  "percentage"
                    ? `${ticketData.discount_snapshot.selected_offer.discount_value}%`
                    : `₹${ticketData.discount_snapshot.selected_offer.discount_value}`}
                </Text>
              </View>
              <View style={styles.offerRow}>
                <Text style={styles.infoLabel}>Base Price</Text>
                <Text style={styles.infoValue}>
                  ₹{ticketData.discount_snapshot.original_price}
                </Text>
              </View>
              <View style={styles.offerRow}>
                <Text style={styles.infoLabel}>Discount Applied</Text>
                <Text style={[styles.infoValue, { color: "#c62828" }]}>
                  -₹
                  {
                    ticketData.discount_snapshot.selected_offer
                      .applied_discount_amount
                  }
                </Text>
              </View>
              <View style={styles.offerRow}>
                <Text style={styles.infoLabel}>Paid</Text>
                <Text style={[styles.infoValue, { color: "#2e7d32" }]}>
                  ₹
                  {
                    ticketData.discount_snapshot.selected_offer
                      .final_price_if_chosen
                  }
                </Text>
              </View>
              {ticketData.discount_snapshot.selected_offer
                .condition_summary && (
                <View style={styles.conditionBox}>
                  <Text style={styles.conditionBoxTitle}>
                    ⚠ Verify these conditions match the player:
                  </Text>
                  {ticketData.discount_snapshot.selected_offer.condition_summary
                    .gender?.length > 0 && (
                    <Text style={styles.conditionRow}>
                      • Gender:{" "}
                      {ticketData.discount_snapshot.selected_offer.condition_summary.gender.join(
                        ", ",
                      )}
                    </Text>
                  )}
                  {ticketData.discount_snapshot.selected_offer.condition_summary
                    .min_age != null &&
                    ticketData.discount_snapshot.selected_offer
                      .condition_summary.max_age != null && (
                      <Text style={styles.conditionRow}>
                        • Age:{" "}
                        {
                          ticketData.discount_snapshot.selected_offer
                            .condition_summary.min_age
                        }
                        –
                        {
                          ticketData.discount_snapshot.selected_offer
                            .condition_summary.max_age
                        }{" "}
                        years
                      </Text>
                    )}
                  {ticketData.discount_snapshot.selected_offer.condition_summary
                    .applicable_days?.length > 0 && (
                    <Text style={styles.conditionRow}>
                      • Valid days:{" "}
                      {ticketData.discount_snapshot.selected_offer.condition_summary.applicable_days.join(
                        ", ",
                      )}
                    </Text>
                  )}
                  {ticketData.discount_snapshot.selected_offer.condition_summary
                    .min_purchase_amt != null && (
                    <Text style={styles.conditionRow}>
                      • Min purchase: ₹
                      {
                        ticketData.discount_snapshot.selected_offer
                          .condition_summary.min_purchase_amt
                      }
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {ticketData?.is_registered ? (
            <>
              <View
                style={[
                  styles.alreadyArrivedNote,
                  { backgroundColor: "#e8f5e9", borderLeftColor: "#2e7d32" },
                ]}
              >
                <Text
                  style={[styles.alreadyArrivedNoteText, { color: "#2e7d32" }]}
                >
                  ✓ This ticket is already registered. Proceed directly to the
                  approval flow.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() =>
                  router.push({
                    pathname: "/Ticketapprovalscreen",
                    params: { ticket_id: ticketData.ticket_id },
                  })
                }
              >
                <Text style={styles.primaryButtonText}>
                  Go to Approval Flow →
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                router.push({
                  pathname: "/Venueregistrationscreen",
                  params: {
                    phone,
                    ticket_id: ticketData?.ticket_id,
                    tournament_id: ticketData?.tournament_id || tournamentId,
                    is_team_ticket: String(ticketData?.is_team_ticket || false),
                    team_name: ticketData?.team_name || "",
                    player_id: playerData?.player_id || "",
                    player_name: playerData?.player_name || "",
                    player_gender: playerData?.gender || "",
                    player_dob: playerData?.dob ? String(playerData.dob) : "",
                    player_email: playerData?.email || "",
                    player_gamer_tag: playerData?.gamer_tag || "",
                    player_photo: playerData?.photo || "",
                    profile_updated: String(
                      playerData?.profile_updated || false,
                    ),
                  },
                })
              }
            >
              <Text style={styles.primaryButtonText}>Register at Venue →</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backLinkText}>← Go back</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── State: ticket + player found → show KYC + ticket + mark arrived ───
  const alreadyArrived =
    ticketData?.ticket_status !== "purchased" &&
    ticketData?.ticket_status !== undefined;

  return (
    <View style={styles.container}>
      <AppBar
        title="Player Found"
        titleFontWeight="bold"
        onMenuPress={() => {}}
        logoSource={require("../assets/images/tehologo.png")}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ticket selector */}
        {allTickets.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Ticket</Text>
            <TouchableOpacity
              style={styles.dropdownSelector}
              onPress={() => setTicketDropdownOpen((v) => !v)}
            >
              <Text style={styles.dropdownSelectorText}>
                {ticketData ? ticketData.ticket_id : "Choose a ticket…"}
              </Text>
              <Text style={styles.dropdownChevron}>
                {ticketDropdownOpen ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>
            {ticketDropdownOpen && (
              <View style={styles.dropdownList}>
                {allTickets.map((t) => (
                  <TouchableOpacity
                    key={t.ticket_id}
                    style={[
                      styles.dropdownItem,
                      ticketData?.ticket_id === t.ticket_id &&
                        styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setTicketData(t);
                      setTicketDropdownOpen(false);
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.dropdownItemId}>{t.ticket_id}</Text>
                      {t.is_team_ticket && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#7b1fa2",
                            fontFamily: "Roboto-Regular",
                          }}
                        >
                          {t.team_name ? `Team: ${t.team_name}` : "Team Ticket"}
                        </Text>
                      )}
                      {t.original_buyer_phone &&
                        t.original_buyer_phone !== phone && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: "#888",
                              fontFamily: "Roboto-Regular",
                            }}
                          >
                            Bought by: {t.original_buyer_phone}
                          </Text>
                        )}
                      {/* Registration badge */}
                      <View
                        style={{
                          marginTop: 3,
                          alignSelf: "flex-start",
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: t.is_registered
                            ? "#e8f5e9"
                            : "#fff3e0",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontFamily: "Roboto-SemiBold",
                            color: t.is_registered ? "#2e7d32" : "#e65100",
                          }}
                        >
                          {t.is_registered
                            ? "✓ Registered"
                            : "⚠ Not Registered"}
                        </Text>
                      </View>
                    </View>
                    <StatusBadge status={t.ticket_status} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Player KYC card (read-only) */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Player KYC</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>Registered</Text>
            </View>
          </View>
          <InfoRow label="Name" value={playerData?.player_name || "—"} />
          <InfoRow label="Phone" value={phone} />
          <InfoRow label="Gender" value={playerData?.gender || "—"} />
          <InfoRow label="Date of Birth" value={dobToString(playerData?.dob)} />
          <InfoRow label="Gamer Tag" value={playerData?.gamer_tag || "—"} />
          <InfoRow label="Email" value={playerData?.email || "—"} />
        </View>

        {/* Ticket card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ticket Details</Text>
          <InfoRow label="Ticket ID" value={ticketData?.ticket_id || "—"} />
          <InfoRow
            label="Type"
            value={ticketData?.is_team_ticket ? "Team Ticket" : "Solo Ticket"}
          />
          {ticketData?.is_team_ticket && (
            <InfoRow
              label="Team Name"
              value={ticketData?.team_name || "Not set"}
            />
          )}
          <InfoRow
            label="Amount Paid"
            value={
              ticketData?.booking_amount ? `₹${ticketData.booking_amount}` : "—"
            }
          />
          <InfoRow
            label="Activities"
            value={`${ticketData?.instance_ids?.length || 0} slot(s)`}
          />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <StatusBadge status={ticketData?.ticket_status || "purchased"} />
          </View>
        </View>

        {/* Discount snapshot */}
        {ticketData?.discount_snapshot?.selected_offer?.discount_id && (
          <View style={styles.discountCard}>
            <Text style={styles.discountCardTitle}>
              🏷️ Discount at Purchase
            </Text>
            <View style={styles.offerRow}>
              <Text style={styles.offerCode}>
                {ticketData.discount_snapshot.selected_offer.discount_code}
              </Text>
              <Text style={styles.offerPrice}>
                -
                {ticketData.discount_snapshot.selected_offer.discount_type ===
                "percentage"
                  ? `${ticketData.discount_snapshot.selected_offer.discount_value}%`
                  : `₹${ticketData.discount_snapshot.selected_offer.discount_value}`}
              </Text>
            </View>
            <View style={styles.offerRow}>
              <Text style={styles.infoLabel}>Base Price</Text>
              <Text style={styles.infoValue}>
                ₹{ticketData.discount_snapshot.original_price}
              </Text>
            </View>
            <View style={styles.offerRow}>
              <Text style={styles.infoLabel}>Discount Applied</Text>
              <Text style={[styles.infoValue, { color: "#c62828" }]}>
                -₹
                {
                  ticketData.discount_snapshot.selected_offer
                    .applied_discount_amount
                }
              </Text>
            </View>
            <View style={styles.offerRow}>
              <Text style={styles.infoLabel}>Paid</Text>
              <Text style={[styles.infoValue, { color: "#2e7d32" }]}>
                ₹
                {
                  ticketData.discount_snapshot.selected_offer
                    .final_price_if_chosen
                }
              </Text>
            </View>
            {ticketData.discount_snapshot.selected_offer.condition_summary && (
              <View style={styles.conditionBox}>
                <Text style={styles.conditionBoxTitle}>
                  ⚠ Verify these conditions match the player:
                </Text>
                {ticketData.discount_snapshot.selected_offer.condition_summary
                  .gender?.length > 0 && (
                  <Text style={styles.conditionRow}>
                    • Gender:{" "}
                    {ticketData.discount_snapshot.selected_offer.condition_summary.gender.join(
                      ", ",
                    )}
                  </Text>
                )}
                {ticketData.discount_snapshot.selected_offer.condition_summary
                  .min_age != null &&
                  ticketData.discount_snapshot.selected_offer.condition_summary
                    .max_age != null && (
                    <Text style={styles.conditionRow}>
                      • Age:{" "}
                      {
                        ticketData.discount_snapshot.selected_offer
                          .condition_summary.min_age
                      }
                      –
                      {
                        ticketData.discount_snapshot.selected_offer
                          .condition_summary.max_age
                      }{" "}
                      years
                    </Text>
                  )}
                {ticketData.discount_snapshot.selected_offer.condition_summary
                  .applicable_days?.length > 0 && (
                  <Text style={styles.conditionRow}>
                    • Valid days:{" "}
                    {ticketData.discount_snapshot.selected_offer.condition_summary.applicable_days.join(
                      ", ",
                    )}
                  </Text>
                )}
                {ticketData.discount_snapshot.selected_offer.condition_summary
                  .min_purchase_amt != null && (
                  <Text style={styles.conditionRow}>
                    • Min purchase: ₹
                    {
                      ticketData.discount_snapshot.selected_offer
                        .condition_summary.min_purchase_amt
                    }
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Action area */}
        {!ticketData?.is_registered ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: "/Venueregistrationscreen",
                params: {
                  phone,
                  ticket_id: ticketData?.ticket_id,
                  tournament_id: ticketData?.tournament_id || tournamentId,
                  is_team_ticket: String(ticketData?.is_team_ticket || false),
                  team_name: ticketData?.team_name || "",
                  player_id: playerData?.player_id || "",
                  player_name: playerData?.player_name || "",
                  player_gender: playerData?.gender || "",
                  player_dob: playerData?.dob ? String(playerData.dob) : "",
                  player_email: playerData?.email || "",
                  player_gamer_tag: playerData?.gamer_tag || "",
                  player_photo: playerData?.photo || "",
                  profile_updated: playerData?.profile_updated
                    ? "true"
                    : "false",
                },
              })
            }
          >
            <Text style={styles.primaryButtonText}>Register at Venue →</Text>
          </TouchableOpacity>
        ) : alreadyArrived ? (
          <>
            <View style={styles.alreadyArrivedNote}>
              <Text style={styles.alreadyArrivedNoteText}>
                ✓ Player has already been marked as arrived. Proceed to the
                approval flow.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGoToApproval}
            >
              <Text style={styles.primaryButtonText}>
                Go to Approval Flow →
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.arrivedInstruction}>
              <Text style={styles.arrivedInstructionText}>
                Verify the player is physically present, then mark them as
                arrived to start the approval process.
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                markArrivedLoading && styles.primaryButtonDisabled,
              ]}
              onPress={handleMarkArrived}
              disabled={markArrivedLoading}
            >
              {markArrivedLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Mark as Arrived →</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go back</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Loading / error
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: "Roboto-Regular",
    color: "#666",
  },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: {
    fontSize: 15,
    fontFamily: "Roboto-Regular",
    color: "#c62828",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.accent,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontFamily: "Roboto-SemiBold",
    fontSize: 14,
  },

  // State screens
  bigIcon: { fontSize: 52, marginBottom: 12 },
  stateTitle: {
    fontSize: 20,
    fontFamily: "Roboto-SemiBold",
    color: "#222",
    marginBottom: 8,
    textAlign: "center",
  },
  stateSubtitle: {
    fontSize: 14,
    fontFamily: "Roboto-Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  phoneHighlight: {
    fontFamily: "Roboto-SemiBold",
    color: "#333",
  },
  stateCard: {
    alignItems: "center",
    paddingVertical: 24,
  },

  // Player pill (small)
  playerPillSmall: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  playerPillName: {
    fontSize: 15,
    fontFamily: "Roboto-SemiBold",
    color: "#333",
  },
  playerPillPhone: {
    fontSize: 13,
    fontFamily: "Roboto-Regular",
    color: "#888",
    marginTop: 2,
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
    fontSize: 14,
    fontFamily: "Roboto-SemiBold",
    color: "#888",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  verifiedBadge: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontFamily: "Roboto-SemiBold",
    color: "#2e7d32",
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
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

  // Discount card
  discountCard: {
    backgroundColor: "#fffde7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fff59d",
  },
  discountCardTitle: {
    fontSize: 13,
    fontFamily: "Roboto-SemiBold",
    color: "#f57f17",
    marginBottom: 8,
  },
  offerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  offerCode: {
    fontSize: 13,
    fontFamily: "Roboto-Regular",
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

  // Buttons
  primaryButton: {
    backgroundColor: "#2d7a2d",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonDisabled: {
    backgroundColor: "#9cba9c",
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: "Roboto-SemiBold",
    color: "#fff",
    paddingHorizontal: 20,
  },
  backLink: {
    alignItems: "center",
    paddingVertical: 10,
  },
  backLinkText: {
    fontSize: 14,
    fontFamily: "Roboto-Regular",
    color: "#888",
  },

  // Ticket dropdown
  dropdownSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
  },
  dropdownSelectorText: {
    fontSize: 14,
    fontFamily: "Roboto-Medium",
    color: "#333",
    flex: 1,
  },
  dropdownChevron: {
    fontSize: 12,
    color: "#888",
    marginLeft: 8,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 6,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  dropdownItemActive: {
    backgroundColor: "#f0faf0",
  },
  dropdownItemId: {
    fontSize: 13,
    fontFamily: "Roboto-Medium",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },

  // Notes
  alreadyArrivedNote: {
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#2e7d32",
  },
  alreadyArrivedNoteText: {
    fontSize: 13,
    fontFamily: "Roboto-Regular",
    color: "#2e7d32",
    lineHeight: 20,
  },
  arrivedInstruction: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  arrivedInstructionText: {
    fontSize: 13,
    fontFamily: "Roboto-Regular",
    color: "#555",
    lineHeight: 20,
  },
});
