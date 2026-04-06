
import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import Colors from "../theme/Colors";

const { width } = Dimensions.get("window");
const scaleSize = (size: number) => (width < 600 ? size : size * 1.4);

export default function GenderDropdown({ selectedGender, onSelectGender, isDisabled }: any) {

  const data = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Gender</Text>
      <View style={{ position: 'relative' }}>
        <Dropdown
          style={[
            styles.dropdown,
            isDisabled && styles.dropdown
          ]}
          data={data}
          labelField="label"
          valueField="value"
          placeholder="Select Gender"
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={[
            styles.selectedTextStyle,
            isDisabled && styles.itemTextStyle
          ]}
          itemTextStyle={styles.itemTextStyle}
          value={selectedGender}
          onFocus={() => !isDisabled}
          onChange={(item) => !isDisabled && onSelectGender(item.value)}
          disable={isDisabled}
        />
        {isDisabled && (
          <View 
            style={styles.overlay}
            pointerEvents="box-only"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width * 0.8,
    marginBottom: scaleSize(10),
  },
  label: {
    position: 'absolute',
    top: scaleSize(-10),
    left: scaleSize(10),
    backgroundColor: Colors.background,
    paddingHorizontal: scaleSize(5),
    fontSize: scaleSize(12),
    zIndex: 2,
    fontFamily:'Roboto-Regular'
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#000000ff",
    borderRadius: 4,
    height: scaleSize(55),
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: scaleSize(55),
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  placeholderStyle: {
    fontSize: width < 600 ? 14 : 18,
    color: "#999",
  },
  selectedTextStyle: {
    fontSize: width < 600 ? 14 : 18,
    color: "#333",
  },
  itemTextStyle: {
    fontSize: width < 600 ? 14 : 18,
    color: "#333",
    fontFamily:'Roboto-Regular',
    lineHeight:10,
    letterSpacing:0.3
  },
});