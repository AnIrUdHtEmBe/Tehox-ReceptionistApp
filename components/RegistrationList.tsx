import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "../theme/Colors";

const { width, height } = Dimensions.get("window");

interface RegistrationItem {
  player_id: string;
  name: string;
  joinedOn: number;
  photo: string;
  gamer_tag: string;
  email: string;
  phone_no: string;
  gender: string;
}

interface PreviousRegistrationsProps {
  registrations: RegistrationItem[];
  page: number; // ← new
  totalPages: number; // ← new
  listLoading: boolean; // ← new
  onNext: () => void; // ← new
  onPrev: () => void; // ← new
}

const formatJoinedTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function PreviousRegistrations({
  registrations,
  page,
  totalPages,
  listLoading,
  onNext,
  onPrev,
}: PreviousRegistrationsProps) {
  const PLACEHOLDER_AVATAR = require("../assets/images/avatar.jpg");
  const CF_DOMAIN = process.env.EXPO_PUBLIC_CF_DOMAIN;
  const router = useRouter();
  const handleItemPress = (item: RegistrationItem) => {
    const paramsToSend = {
      name: item.name,
      email: item.email,
      gamerTag: item.gamer_tag,
      mobile: item.phone_no,
      gender: item.gender,
      photoType: "photo",
      photoUri: item.photo ? `${CF_DOMAIN}/${item.photo}` : "",
      avatarName: null,
      playerId: item.player_id,
    };
    router.push({ pathname: "/VerifyDetailsPage", params: paramsToSend });
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: RegistrationItem;
    index: number;
  }) => (
    <Pressable
      onPress={() => handleItemPress(item)}
      style={({ pressed }) => [
        styles.item,
        pressed && { backgroundColor: "#f3f3f3" },
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.indexText}>{index + 1}.</Text>

        <Image
          source={
            item.photo
              ? { uri: `${CF_DOMAIN}/${item.photo}` }
              : PLACEHOLDER_AVATAR
          }
          style={styles.avatar}
        />

        <Text style={styles.name}>{item.gamer_tag}</Text>
      </View>

      <Text style={styles.time}>{formatJoinedTime(item.joinedOn)}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Previous Registrations</Text>
      <View style={styles.listArea}>
        {/* ← new wrapper */}
        {listLoading ? (
          <ActivityIndicator
            size="small"
            color={Colors.accent}
            style={{ marginTop: 20 }}
          />
        ) : registrations && registrations.length > 0 ? (
          <FlatList
            data={registrations}
            keyExtractor={(item) => item.player_id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        ) : (
          <Text style={styles.noDataText}>
            No previous registrations found.
          </Text>
        )}
      </View>
      {/* ← close wrapper */}
      <View style={styles.pagination}>
        <Pressable
          onPress={onPrev}
          disabled={page <= 1}
          style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
        >
          <Text style={styles.pageBtnText}>{"<"}</Text>
        </Pressable>
        <Text style={styles.pageInfo}>
          {page} / {totalPages}
        </Text>
        <Pressable
          onPress={onNext}
          disabled={page >= totalPages}
          style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
        >
          <Text style={styles.pageBtnText}>{">"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  listArea: {
    flex: 1, // ← pushes pagination to bottom always
  },
  title: {
    fontSize: 20,
    marginBottom: 5,
    color: Colors.text,
    textAlign: "center",
    fontFamily: "Inter-Medium",
    lineHeight: 28,
  },
  list: {
    maxHeight: height * 0.45,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
    width: width * 0.9,
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  indexText: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: "Inter-Medium",
    marginRight: 10,
    width: 25,
    textAlign: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: "Inter-Medium",
  },
  time: {
    fontSize: 12,
    color: "#555",
    fontFamily: "Roboto-Regular",
  },
  noDataText: {
    textAlign: "center",
    marginTop: 10,
    color: Colors.text,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end", // ← right aligned
    paddingVertical: 32,
    paddingHorizontal: 5, // ← align with list items
    gap: 16,
  },
  pageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#418ED6", // ← your color
  },
  pageBtnDisabled: {
    backgroundColor: "#B0B0B0", // ← grey instead of opacity
  },
  pageBtnText: {
    color: "white",
    fontSize: 11, // ← smaller
    fontFamily: "Inter-Medium",
  },
  pageInfo: {
    fontSize: 11, // ← smaller
    color: Colors.text,
    fontFamily: "Inter-Medium",
  },
});
