import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "staff_token";
const SELECTED_TOURNAMENT_KEY = "selected_tournament_id";

import { parseJwt } from "../utils/parseJwt";

// ─── Types ──────────────────────────────────────────────────────────────
interface Tournament {
  id: string;
  name: string;
}

interface StaffInfo {
  staff_id: string;
  name: string;
  role: string;
}

interface TournamentContextType {
  /** Active tournament ID — selected by user post-login */
  tournamentId: string;
  /** Full list of tournaments this staff member can access (from JWT) */
  availableTournaments: Tournament[];
  staffInfo: StaffInfo | null;
  isLoggedIn: boolean;
  isReady: boolean;
  /** Step 1: store token and populate availableTournaments; does NOT set tournamentId */
  login: (token: string) => Promise<void>;
  /** Step 2: called after user picks a tournament */
  selectTournament: (id: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TournamentContext = createContext<TournamentContextType>({
  tournamentId: "",
  availableTournaments: [],
  staffInfo: null,
  isLoggedIn: false,
  isReady: false,
  login: async () => {},
  selectTournament: async () => {},
  logout: async () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────
export function TournamentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tournamentId, setTournamentId] = useState("");
  const [availableTournaments, setAvailableTournaments] = useState<Tournament[]>([]);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // ── Restore auth + selected tournament on app launch ──────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
          const payload = parseJwt(token);
          if (payload) {
            const tournaments: Tournament[] = payload.tournaments || [];
            setAvailableTournaments(tournaments);
            setStaffInfo({
              staff_id: payload.staff_id,
              name: payload.name,
              role: payload.role || "",
            });
            setIsLoggedIn(true);

            // Restore the previously selected tournament
            const savedId = await AsyncStorage.getItem(SELECTED_TOURNAMENT_KEY);
            if (savedId) {
              setTournamentId(savedId);
            }
          }
        }
      } catch {
        // Silent: corrupted token or storage error
      } finally {
        setIsReady(true);
      }
    };
    restore();
  }, []);

  // ── Step 1: Login — store token, populate available list ──────────────
  const login = async (token: string) => {
    const payload = parseJwt(token);
    if (payload) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      const tournaments: Tournament[] = payload.tournaments || [];
      setAvailableTournaments(tournaments);
      setStaffInfo({
        staff_id: payload.staff_id,
        name: payload.name,
        role: payload.role || "",
      });
      setIsLoggedIn(true);
      // Do NOT set tournamentId yet — user must call selectTournament
    }
  };

  // ── Step 2: Select tournament ─────────────────────────────────────────
  const selectTournament = async (id: string) => {
    await AsyncStorage.setItem(SELECTED_TOURNAMENT_KEY, id);
    setTournamentId(id);
  };

  // ── Logout ────────────────────────────────────────────────────────────
  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(SELECTED_TOURNAMENT_KEY);
    setTournamentId("");
    setAvailableTournaments([]);
    setStaffInfo(null);
    setIsLoggedIn(false);
  };

  return (
    <TournamentContext.Provider
      value={{
        tournamentId,
        availableTournaments,
        staffInfo,
        isLoggedIn,
        isReady,
        login,
        selectTournament,
        logout,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export const useTournament = () => useContext(TournamentContext);
