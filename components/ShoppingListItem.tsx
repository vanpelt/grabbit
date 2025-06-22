import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CATEGORIES,
  ItemCategory,
  ShoppingItem,
} from "../utils/shoppingCategories";

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
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const handleUpdate = () => {
    if (editedName.trim() && editedName.trim() !== item.name) {
      onUpdate(item.id, { name: editedName.trim() });
    } else {
      setEditedName(item.name);
    }
    setIsEditing(false);
  };

  const handleCategorySelect = (category: ItemCategory) => {
    onUpdate(item.id, { primaryCategory: category });
    setIsPickerVisible(false);
  };

  const nearbyText = item.isNearby
    ? "1 store nearby"
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
          <Ionicons name="trash-outline" size={24} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
      <View style={styles.itemFooter}>
        <Text
          style={[
            styles.itemDetails,
            !item.isNearby && styles.itemDetailsNotNearby,
          ]}
        >
          {nearbyText}
        </Text>
        <TouchableOpacity onPress={() => setIsPickerVisible(true)}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {item.primaryCategory.emoji} {item.primaryCategory.name}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={isPickerVisible}
        onRequestClose={() => {
          setIsPickerVisible(!isPickerVisible);
        }}
      >
        <TouchableOpacity
          style={styles.centeredView}
          activeOpacity={1}
          onPressOut={() => setIsPickerVisible(false)}
        >
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Choose a category</Text>
            <FlatList
              data={CATEGORIES.filter((c) => c.id !== "unknown")}
              renderItem={({ item: category }) => (
                <TouchableOpacity
                  style={styles.categoryButton}
                  onPress={() => handleCategorySelect(category)}
                >
                  <Text style={styles.categoryButtonText}>
                    {category.emoji} {category.name}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(category) => category.id}
              style={styles.categoryList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
    padding: 5,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  itemDetails: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginRight: 10,
  },
  itemDetailsNotNearby: {
    color: "#9ca3af",
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
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
  },
  tagText: {
    color: "#667eea",
    fontWeight: "600",
    fontSize: 12,
  },
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "100%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: "80%",
  },
  modalText: {
    marginBottom: 20,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  categoryList: {
    width: "100%",
  },
  categoryButton: {
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    width: "100%",
  },
  categoryButtonText: {
    fontSize: 16,
    textAlign: "center",
  },
});
