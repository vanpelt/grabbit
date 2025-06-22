import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ShoppingItem } from "../hooks/shoppingCategories";

interface ShoppingListItemProps {
  item: ShoppingItem & { isNearby?: boolean };
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ShoppingItem>) => void;
}

export const ShoppingListItem = ({
  item,
  onRemove,
  onUpdate,
}: ShoppingListItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);

  const handleUpdate = () => {
    if (editedName.trim() && editedName.trim() !== item.name) {
      onUpdate(item.id, { name: editedName.trim() });
    } else {
      setEditedName(item.name);
    }
    setIsEditing(false);
  };

  const nearbyText = item.isNearby
    ? "A relevant store is nearby!"
    : "No nearby stores detected";

  return (
    <View style={styles.itemContainer}>
      <View style={styles.itemHeader}>
        {isEditing ? (
          <TextInput
            value={editedName}
            onChangeText={setEditedName}
            onBlur={handleUpdate}
            onSubmitEditing={handleUpdate}
            autoFocus
            style={styles.itemName}
          />
        ) : (
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            style={styles.nameContainer}
          >
            <Text style={styles.itemName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onRemove(item.id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>DELETE</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.itemDetails}>{nearbyText}</Text>
      <View style={styles.tagContainer}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {item.primaryCategory.emoji} {item.primaryCategory.name}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  nameContainer: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  deleteButton: {
    backgroundColor: "#ff6b6b",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  itemDetails: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  tag: {
    backgroundColor: "#e0e7ff",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 5,
    marginBottom: 5,
  },
  tagText: {
    color: "#667eea",
    fontWeight: "600",
    fontSize: 12,
  },
});
