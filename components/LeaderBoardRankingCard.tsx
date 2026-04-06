import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface Player {
  player_id: string;
  player_name: string;
  photo: string;
  total_points: number;
  rank: number;
}

interface LeaderboardResponse {
  // activity_instance_id: string;
  total_players: number;
  leaderboard: Player[];
}

interface LeaderboardComponentProps {
  name: string;
  player_id: string;
  prizes: Prize[];
  tournamentId?: string;
}

export interface Prize {
  position: number;
  prize_id: string;
  prize_text: string;
  prize_photo: string;
  prize_value: string;
  prize_cost: string;
}

const { width, height } = Dimensions.get("window");
const API_BASE_URL = process.env.EXPO_PUBLIC_API;
const AWS_BASE_URL = process.env.EXPO_PUBLIC_CF_DOMAIN;

const LeaderboardComponent: React.FC<LeaderboardComponentProps> = ({
  name,
  player_id,
  prizes,
  tournamentId,
}) => {
  const [leaderboardData, setLeaderboardData] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/our-activity-performances/leaderboard${tournamentId ? `?tournament_id=${tournamentId}` : ""}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const data: Player[] = await response.json();

      // Convert API output → UI expected structure
      const normalized = data.map((item) => ({
        ...item,
        player_photo: item.photo,
        collected_points: item.total_points,
      }));

      setLeaderboardData(normalized);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError("Unable to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getImageUri = (photoPath: string) => {
    if (!photoPath || photoPath === "None" || photoPath === "") return "";
    return `${AWS_BASE_URL}/${photoPath}`;
  };

  const getMedalImage = (rank: number) => {
    switch (rank) {
      case 1:
        return require("../assets/images/gold.png");
      case 2:
        return require("../assets/images/silver.png");
      case 3:
        return require("../assets/images/brownz.png");
      default:
        return null;
    }
  };

  const getPrizeForRank = (rank: number): Prize | null => {
    if (!prizes || !Array.isArray(prizes)) return null;
    return prizes.find((p) => p.position === rank) ?? null;
  };

  const isCurrentPlayer = (playerId: string) => {
    return playerId === player_id;
  };

  const TopPlayerCard = ({
    player,
    isCenter,
  }: {
    player: Player;
    isCenter: boolean;
  }) => {
    const medalImage = getMedalImage(player.rank);
    const isHighlighted = isCurrentPlayer(player.player_id);

    return (
      <View style={[styles.topPlayerCard, isCenter && styles.centerCard]}>
        <View style={styles.avatarContainer}>
          <Image
            source={
              getImageUri(player.photo)
                ? { uri: getImageUri(player.photo) }
                : require("../assets/images/avatar.jpg")
            }
            style={[styles.avatar, isCenter && styles.centerAvatar]}
          />
          {medalImage && (
            <Image source={medalImage} style={styles.medalImage} />
          )}
        </View>

        <View style={styles.pointsContainer}>
          <Text style={styles.pointsText}>{player.total_points} Points</Text>
        </View>

        {(() => {
          const prize = getPrizeForRank(player.rank);
          if (!prize) return null;
          return (
            <>
              <Text style={styles.prizeLabel}>
                {player.rank === 1
                  ? "1st Prize"
                  : player.rank === 2
                    ? "2nd Prize"
                    : "3rd Prize"}
              </Text>
              {prize.prize_photo ? (
                <Image
                  source={{ uri: prize.prize_photo }}
                  style={{
                    width: 40,
                    height: 40,
                    resizeMode: "contain",
                    marginBottom: 4,
                  }}
                />
              ) : null}
              <Text style={styles.prizeText}>{prize.prize_text}</Text>
              <Text style={[styles.prizeText, { color: "#43a62f" }]}>
                {prize.prize_value}
              </Text>
            </>
          );
        })()}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#43a62f" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const topThree = leaderboardData.slice(0, 3);
  const restPlayers = leaderboardData.slice(3);

  return (
    <View style={styles.container}>
      {/* Top 3 Players */}
      {topThree.length > 0 && (
        <View style={styles.topThreeContainer}>
          <View style={styles.topThreeRow}>
            {topThree.map((player, index) => (
              <View
                key={player.player_id}
                style={[
                  styles.firstPlayerWrapper,
                  index === 1 && styles.middlePlayer,
                ]}
              >
                <Text
                  style={[
                    styles.firstThreeName,
                    isCurrentPlayer(player.player_id) && styles.highlightedText,
                  ]}
                >
                  #{player.rank} {player.player_name}
                </Text>
                <TopPlayerCard player={player} isCenter={false} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, { flex: 2 }]}>Rank</Text>
        <Text style={[styles.headerText, { flex: 4 }]}>Player</Text>
        <Text style={[styles.headerText, { flex: 3, textAlign: "center" }]}>
          Prize
        </Text>
        <Text style={[styles.headerText, { flex: 2, textAlign: "center" }]}>
          Points
        </Text>
      </View>

      {/* Player List - Scrollable */}
      <ScrollView
        style={styles.scrollableList}
        showsVerticalScrollIndicator={false}
      >
        {restPlayers.map((player, index) => {
          const isHighlighted = isCurrentPlayer(player.player_id);

          return (
            <View
              key={player.player_id}
              style={[styles.tableRow, isHighlighted && styles.highlightedRow]}
            >
              <Text
                style={[
                  styles.rankText,
                  { flex: 2 },
                  isHighlighted && styles.highlightedText,
                ]}
              >
                #{player.rank}
              </Text>

              <View style={[styles.playerInfo, { flex: 4 }]}>
                <Image
                  source={
                    getImageUri(player.photo)
                      ? { uri: getImageUri(player.photo) }
                      : require("../assets/images/avatar.jpg")
                  }
                  style={styles.smallAvatar}
                />
                <Text
                  style={[
                    styles.playerNameText,
                    isHighlighted && styles.highlightedText,
                  ]}
                >
                  {player.player_name}
                </Text>
              </View>

              <View style={[styles.prizeIcon, { flex: 3 }]}>
                {(() => {
                  const prize = getPrizeForRank(player.rank);
                  if (!prize)
                    return (
                      <Text style={{ fontSize: 12, color: "#999" }}>—</Text>
                    );
                  return (
                    <>
                      {prize.prize_photo ? (
                        <Image
                          source={{ uri: prize.prize_photo }}
                          style={{
                            width: 28,
                            height: 28,
                            resizeMode: "contain",
                          }}
                        />
                      ) : null}
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#666",
                          textAlign: "center",
                        }}
                      >
                        {prize.prize_text}
                      </Text>
                    </>
                  );
                })()}
              </View>

              <Text style={[styles.pointsValue, { flex: 2 }]}>
                {player.total_points}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default LeaderboardComponent;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    marginTop: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: "Inter-Regular",
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 200,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter-Regular",
    color: "#f44336",
    textAlign: "center",
  },
  topThreeContainer: {
    paddingTop: 15,
    marginBottom: 20,
  },
  topThreeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
  },
  topPlayerCard: {
    alignItems: "center",
    width: width * 0.25,
    marginTop: 10,
    padding: 8,
    borderRadius: 12,
  },
  highlightedCard: {
    backgroundColor: "#e8f5e9",
    borderWidth: 1,
    borderColor: "#43a62f",
  },
  centerCard: {
    marginTop: 0,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 40,
    // borderWidth: 4,
    // borderColor: 'black',
  },
  centerAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  firstPlayerWrapper: {
    alignItems: "center",
  },
  medalImage: {
    position: "absolute",
    top: -10,
    right: -20,
    width: 25.6,
    height: 26,
    resizeMode: "contain",
  },
  firstThreeName: {
    fontSize: 15,
    fontFamily: "Inter-Bold",
    color: "#333",
    marginBottom: 0,
  },
  pointsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderRadius: 8,
    width: 70,
    height: 24,
    justifyContent: "center",
    backgroundColor: "#eafbe4",
  },

  pointsText: {
    fontSize: 12,
    color: "#43a62f",
    fontFamily: "Inter-Bold",
  },
  prizeLabel: {
    fontSize: 12,
    fontFamily: "Inter-Bold",
    marginBottom: 2,
  },
  prizeText: {
    fontSize: 12,
    fontFamily: "Raleway-Regular",
    textAlign: "center",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#eafbe4",
    marginBottom: 1,
  },
  headerText: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: "#E4E4E4",
  },
  highlightedRow: {
    backgroundColor: "#eafbe4",
    marginVertical: 1,
  },
  highlightedText: {
    color: "black",
    fontWeight: "bold",
  },
  rankText: {
    fontSize: 14,
    fontFamily: "Inter-Bold",
  },
  playerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  smallAvatar: {
    width: 45,
    height: 45,
    borderRadius: 24,
    marginRight: 12,
    // borderWidth: 2,
    // borderColor: 'black',
  },
  playerNameText: {
    fontSize: 14,
    fontFamily: "Inter-Regular",
    flex: 1,
  },
  prizeIcon: {
    alignItems: "center",
  },
  pointsValue: {
    fontSize: 13,
    fontFamily: "Inter-Bold",
    color: "#43a62f",
    textAlign: "center",
  },
  scrollableList: {
    maxHeight: height * 0.35,
  },
  middlePlayer: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#E4E4E4",
    paddingHorizontal: 10,
  },
});
