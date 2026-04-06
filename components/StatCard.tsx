import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Colors from '../theme/Colors';
interface StatCardProps {
  todayCount: number;
  monthCount: number;
}

const {width, height} = Dimensions.get('window');

const StatCard: React.FC<StatCardProps> = ({ todayCount, monthCount }) => {
  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.count}>{todayCount}</Text>
        <Text style={styles.label}>Today</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.box}>
        <Text style={styles.count}>{monthCount}</Text>
        <Text style={styles.label}>This Month</Text>
      </View>
    </View>
  );
};

export default StatCard;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: height*0.01,
    overflow: 'hidden',
    width: width, 
    height: height *0.14
  },
  box: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  count: {
    color: Colors.accent, 
    fontSize: 40,
    fontFamily: 'Roboto-SemiBold',
    lineHeight: 48,
    letterSpacing:0,
  },
  label: {
    marginTop: 4,
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'Roboto-SemiBold',
    lineHeight: 36,
    letterSpacing:0,
  },
  divider: {
    width: 1,
    backgroundColor: 'transparent',
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    borderLeftColor: '#000000ff',
    marginVertical: 8,
    marginHorizontal: 0,
  },
});
