import random
import os

OUTPUT_FILE = "example_dataset.arff"
NUM_ENTRIES = 10000

ITEMS = [
    "Forest honey",
    "Homemade sausage",
    "Onion",
    "Potato",
    "Fresh milk",
    "Beef steak",
    "Carrots",
    "Tomato",
    "Gouda cheese",
    "Eggs"
]

def generate_dataset():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, OUTPUT_FILE)

    with open(output_path, "w") as f:
        f.write("@relation farmer_box_monthly_orders\n\n")
        for item in ITEMS:
            f.write(f'@attribute "{item.lower()}" {{0,1}}\n')
            
        f.write("\n@data\n")
        for _ in range(NUM_ENTRIES):
            order = {item: 0 for item in ITEMS}
            scenario = random.choice(["Breakfast", "Stew", "Snack", "Grill", "Random"])
            
            if scenario == "Breakfast":
                # High chance of Eggs, Sausage, Milk
                if random.random() < 0.85: order["Eggs"] = 1
                if random.random() < 0.70: order["Homemade sausage"] = 1
                if random.random() < 0.60: order["Fresh milk"] = 1
                if random.random() < 0.30: order["Forest honey"] = 1
                
            elif scenario == "Stew":
                # High chance of Potato, Onion, Carrots, Beef
                if random.random() < 0.90: order["Potato"] = 1
                if random.random() < 0.85: order["Onion"] = 1
                if random.random() < 0.80: order["Carrots"] = 1
                if random.random() < 0.60: order["Beef steak"] = 1
                
            elif scenario == "Snack":
                # High chance of Cheese, Tomato, Honey
                if random.random() < 0.80: order["Gouda cheese"] = 1
                if random.random() < 0.70: order["Tomato"] = 1
                if random.random() < 0.50: order["Forest honey"] = 1
                
            elif scenario == "Grill":
                # High chance of Steak, Sausage, Onion
                if random.random() < 0.90: order["Beef steak"] = 1
                if random.random() < 0.80: order["Homemade sausage"] = 1
                if random.random() < 0.70: order["Onion"] = 1
                if random.random() < 0.60: order["Potato"] = 1
            
            # Some random noise
            for item in ITEMS:
                if random.random() < 0.05:
                    order[item] = 1
            
            # Ensure at least one item is bought
            if sum(order.values()) == 0:
                order[random.choice(ITEMS)] = 1
            
            row_values = [str(order[item]) for item in ITEMS]
            f.write(",".join(row_values) + "\n")

    print(f"Successfully generated {NUM_ENTRIES} entries in {output_path}")

if __name__ == "__main__":
    generate_dataset()