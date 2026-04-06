import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "staff_token";

import { parseJwt } from "../utils/parseJwt";

interface StaffInfo {
  staff_id: string;
  name: string;
  tournament_id: string;
}

interface TournamentContextType {
  tournamentId: string;
  staffInfo: StaffInfo | null;
  isLoggedIn: boolean;
  isReady: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TournamentContext = createContext<TournamentContextType>({
  tournamentId: "",
  staffInfo: null,
  isLoggedIn: false,
  isReady: false,
  login: async () => {},
  logout: async () => {},
});

export function TournamentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tournamentId, setTournamentId] = useState("");
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then((token) => {
      if (token) {
        const payload = parseJwt(token);
        if (payload) {
          setTournamentId(payload.tournament_id || "");
          setStaffInfo({
            staff_id: payload.staff_id,
            name: payload.name,
            tournament_id: payload.tournament_id,
          });
          setIsLoggedIn(true);
        }
      }
      setIsReady(true);
    });
  }, []);

  const login = async (token: string) => {
    const payload = parseJwt(token);
    if (payload) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      setTournamentId(payload.tournament_id || "");
      setStaffInfo({
        staff_id: payload.staff_id,
        name: payload.name,
        tournament_id: payload.tournament_id,
      });
      setIsLoggedIn(true);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setTournamentId("");
    setStaffInfo(null);
    setIsLoggedIn(false);
  };

  return (
    <TournamentContext.Provider
      value={{ tournamentId, staffInfo, isLoggedIn, isReady, login, logout }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export const useTournament = () => useContext(TournamentContext);
