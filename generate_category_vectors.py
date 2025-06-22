#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "sentence_transformers",
# ]
# ///

import json
from pathlib import Path

import sentence_transformers as st

# Define descriptive phrases and questions for each category to leverage the
# question-answering capabilities of the multi-qa-MiniLM-L6-cos-v1 model.
CATEGORIES = {
    "grocery": [
        "Where would I buy groceries?",
        "I need to get some food.",
        "Find a supermarket.",
        "Shopping for produce and pantry items.",
    ],
    "pharmacy": [
        "Where can I fill a prescription?",
        "I need to buy medicine.",
        "Find a drugstore.",
        "Looking for health and wellness products.",
    ],
    "hardware": [
        "Where can I buy tools and supplies for home repair?",
        "I need items for a DIY project.",
        "Find a hardware store.",
        "Shopping for building materials.",
    ],
    "department": [
        "Where can I buy clothes and home goods?",
        "I need to go to a department store.",
        "Shopping for apparel and general merchandise.",
        "Find a big box retailer like Target or Macy's.",
    ],
    "pet": [
        "Where can I buy food for my dog?",
        "I need pet supplies.",
        "Find a pet store.",
        "Shopping for animal products.",
    ],
    "electronics": [
        "Where can I buy a new phone or computer?",
        "I need consumer electronics.",
        "Find an electronics store.",
        "Shopping for gadgets and accessories.",
    ],
    "service": [
        "Where can I get gasoline for my car?",
        "I need to fill up my tank.",
        "Find a gas station.",
        "Looking for automotive services.",
    ],
    "music": [
        "Where can I buy a guitar?",
        "I need musical instruments or accessories.",
        "Find a music store.",
        "Shopping for audio equipment.",
    ],
    "bookstore": [
        "Where can I buy books?",
        "I'm looking for a new novel to read.",
        "Find a bookshop.",
        "Shopping for magazines and reading material.",
    ],
    "unknown": [
        "This item is not in a specific category.",
        "Where can I find miscellaneous items?",
        "Uncategorized item.",
    ],
}

def generate_vectors():
    """
    Generates sentence embeddings for each category and saves them to a JSON file.
    """
    print("Loading sentence transformer model: multi-qa-MiniLM-L6-cos-v1...")
    model = st.SentenceTransformer("sentence-transformers/multi-qa-MiniLM-L6-cos-v1")

    print("Encoding categories...")
    # For each category, encode the descriptive phrases and take the mean of the vectors
    # to get a single representative vector.
    category_vectors = {
        category: model.encode(phrases).mean(axis=0).tolist()
        for category, phrases in CATEGORIES.items()
    }

    # Define the output path for the vectors
    output_path = Path("assets/data/category_vectors.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Saving category vectors to {output_path}...")
    with open(output_path, "w") as f:
        json.dump(category_vectors, f, indent=2)

    print("✅ Category vectors generated successfully!")


if __name__ == "__main__":
    generate_vectors() 