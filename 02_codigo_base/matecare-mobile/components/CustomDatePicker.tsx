import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TYPOGRAPHY } from '../constants/theme';

interface CustomDatePickerProps {
  date: Date;
  onChange: (date: Date) => void;
}

export default function CustomDatePicker({ date, onChange }: CustomDatePickerProps) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const updateDate = (newDay: number, newMonth: number, newYear: number) => {
    const d = new Date(newYear, newMonth - 1, newDay);
    if (d.getTime()) {
      onChange(d);
    }
  };

  const Selector = ({ value, label, onPrev, onNext }: any) => (
    <View style={styles.selector}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.button} onPress={onPrev}>
        <Text style={styles.buttonText}>-</Text>
      </TouchableOpacity>
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value.toString().padStart(2, '0')}</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={onNext}>
        <Text style={styles.buttonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Selector 
        label="Día" 
        value={day} 
        onPrev={() => updateDate(Math.max(1, day - 1), month, year)}
        onNext={() => updateDate(Math.min(31, day + 1), month, year)}
      />
      <Selector 
        label="Mes" 
        value={month} 
        onPrev={() => updateDate(day, Math.max(1, month - 1), year)}
        onNext={() => updateDate(day, Math.min(12, month + 1), year)}
      />
      <Selector 
        label="Año" 
        value={year} 
        onPrev={() => updateDate(day, month, year - 1)}
        onNext={() => updateDate(day, month, year + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E8E4DF',
    elevation: 2,
  },
  selector: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 24,
    color: '#044422',
    fontWeight: 'bold',
  },
  valueContainer: {
    marginVertical: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#044422',
  },
});
