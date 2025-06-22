import React from "react";
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// --- Prop Types for Header ---
interface ListHeaderProps {
  onAddItem: (name: string) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  newItemName: string;
  setNewItemName: (name: string) => void;
  pulseAnimation: Animated.Value;
}

// --- Header Component ---
// This component is memoized and manages its own state for the inputs,
// preventing the main app from re-rendering on every keystroke.
export const ShoppingListHeader = React.memo(
  ({
    onAddItem,
    isRecording,
    onToggleRecording,
    newItemName,
    setNewItemName,
    pulseAnimation,
  }: ListHeaderProps) => {
    const handlePressAddItem = () => {
      if (!newItemName.trim()) return;
      onAddItem(newItemName);
      setNewItemName("");
    };

    const isInputEmpty = newItemName.trim().length === 0;

    return (
      <>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add shopping item (e.g., milk, batteries)"
            placeholderTextColor="#888"
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={handlePressAddItem} // Allows adding via keyboard return key
          />
          <TouchableOpacity
            style={styles.addItemButton}
            onPress={isInputEmpty ? onToggleRecording : handlePressAddItem}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
              <Text style={styles.addItemButtonText}>
                {isInputEmpty ? (isRecording ? "🛑" : "🎤") : "+"}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        </View>

        <Text style={styles.h2}>Shopping List</Text>
      </>
    );
  }
);

const styles = StyleSheet.create({
  h2: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 10,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === "ios" ? 15 : 10,
    color: "#000",
    fontSize: 16,
  },
  addItemButton: {
    backgroundColor: "#764ba2",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addItemButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 24,
  },
});
