import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// RedirecTimer renders timer along with auto redirection
const RedirectTimer: React.FC = () => {
  const [seconds, setSeconds] = useState(10);
  const [paused, setPaused] = useState(false);

  const router = useRouter();
  useEffect(() => {
    let mounted = true;

    if (seconds === 0) {
      if (mounted) router.dismissAll();
      return;
    }

    if (paused) return;

    const timer = setTimeout(() => {
      if (mounted) setSeconds((s) => s - 1);
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [seconds, paused]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>You will be redirected to home screen in</Text>
      <TouchableOpacity onPress={() => setPaused((p) => !p)}>
        <Text style={styles.timer}>{seconds}s</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setPaused((p) => !p)}>
        <Text
          style={{
            fontSize: 12,
            color: "#888",
            fontFamily: "Roboto-Medium",
            marginTop: 4,
          }}
        >
          {paused ? "resume" : "pause"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 12,
    fontFamily: "Roboto-Regular",
    lineHeight: 16,
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  timer: {
    fontSize: 40,
    fontFamily: "Roboto-Medium",
    lineHeight: 40,
    letterSpacing: 0,
  },
});

export default RedirectTimer;
