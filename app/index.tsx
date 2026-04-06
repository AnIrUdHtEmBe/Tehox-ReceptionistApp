import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import InputFields from "../components/InputFields";
import PreviousRegistrations from "../components/RegistrationList";
import ScanQRButton from "../components/ScanQRButton";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import { useTournament } from "../context/TournamentContext";
import Colors from "../theme/Colors";
import { showToast } from "../utils/Toast";

import { ActivityIndicator, Dimensions, StyleSheet, View } from "react-native";
import AppBar from "../components/AppBar";

const { width, height } = Dimensions.get("window");

interface PreviousRegistrationsList {
  player_id: string;
  name: string;
  joinedOn: number;
  photo: string;
  gamer_tag: string;
  email: string;
  phone_no: string;
  gender: string;
}
// Home Screen of the application
export default function HomeScreen() {
  const [todayCount, setTodayCount] = useState<number>(0);
  const [monthCount, setMonthCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [listLoading, setListLoading] = useState<boolean>(false); // ← new
  const [page, setPage] = useState<number>(1); // ← new
  const [totalPages, setTotalPages] = useState<number>(1); // ← new
  const [previousRegistrations, setPreviousRegistrations] = useState<
    PreviousRegistrationsList[]
  >([]);
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { tournamentId, logout, isReady } = useTournament();
  const BASE_URL = process.env.EXPO_PUBLIC_API;

  const handleLogout = async () => {
    setSidebarOpen(false);
    await logout();
    router.replace("/LoginPage");
  };

  function handleScanQRPress() {
    router.push("/ScanQRPage");
  }

  const fetchPreviousRegistrations = useCallback(
    async (pageNumber: number) => {
      if (!isReady) return;
      // ← accepts page
      setListLoading(true); // ← use listLoading, not loading
      try {
        const res = await fetch(
          `${BASE_URL}/api/player/players?page=${pageNumber}&itemsPerPage=10&sortBy=joinedOn&sortOrder=descending&tournamentId=${tournamentId}`,
          { method: "GET", headers: { Accept: "application/json" } },
        );

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const total = res.headers.get("Player-Total-Count"); // ← read header
        if (total) setTotalPages(Math.ceil(Number(total) / 10));

        const data = await res.json();
        setPreviousRegistrations(data);
      } catch (error) {
        showToast?.("Something went wrong try again later");
      } finally {
        setListLoading(false);
      }
    },
    [BASE_URL, isReady],
  );

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${BASE_URL}/api/our-tickets/stats/today-month`,
          { method: "GET", headers: { Accept: "application/json" } },
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setTodayCount(data.tickets_today);
        setMonthCount(data.tickets_this_month);
      } catch (error) {
        showToast?.("Something went wrong try again!");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchPreviousRegistrations(1);
    }, [fetchPreviousRegistrations]),
  );

  // ← new handlers
  const handleNextPage = () => {
    const next = page + 1;
    setPage(next);
    fetchPreviousRegistrations(next);
  };

  const handlePrevPage = () => {
    const prev = page - 1;
    setPage(prev);
    fetchPreviousRegistrations(prev);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppBar
        title="Home"
        onMenuPress={() => setSidebarOpen(true)} // ← was router.push('/SettingsPage')
        logoSource={require("../assets/images/tehologo.png")}
      />
      <View style={styles.content}>
        <StatCard todayCount={todayCount} monthCount={monthCount} />
        <View style={{ height: 0 }} />
        <ScanQRButton
          width={width * 0.4}
          height={height * 0.06}
          onPress={handleScanQRPress}
        />
        <InputFields />
        <PreviousRegistrations
          registrations={previousRegistrations}
          page={page}
          totalPages={totalPages}
          listLoading={listLoading}
          onNext={handleNextPage}
          onPrev={handlePrevPage}
        />
      </View>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  content: {
    flex: 1,
    alignItems: "center",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
});
