import sys
import os
import json
import re
import traceback

try:
    import weka.core.jvm as jvm
    from weka.core.converters import Loader
    from weka.associations import Associator
except ImportError:
    print("Error: 'python-weka-wrapper3' is not installed.")
    print("Please install it using: pip install python-weka-wrapper3")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(SCRIPT_DIR, "example_dataset.arff")
OUTPUT_JSON = os.path.join(SCRIPT_DIR, "rules.json")

def extract_items_from_string(text, is_lhs=False):
    items = []
    segments = text.split("=1")

    for i in range(len(segments) - 1):
        seg = segments[i]
        if i > 0:
            seg = re.sub(r'^\d+\s+', '', seg)
        if i == 0 and is_lhs:
             seg = re.sub(r'^\d+\.\s+', '', seg)
        
        item_name = seg.strip()
        if item_name:
            items.append(item_name)
            
    return items

def build_predictor():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: Input file '{INPUT_FILE}' not found. Please run generate_dataset.py first.")
        return

    print("Starting Weka JVM...")
    jvm.start()

    try:
        print(f"Loading dataset: {INPUT_FILE}")
        loader = Loader(classname="weka.core.converters.ArffLoader")
        data = loader.load_file(INPUT_FILE)

        print("Building Apriori model...")
        # Options:
        # -Z: Treat zero (first value of nominal attributes) as missing. 
        # -T 0: Metric type = Confidence
        # -C 0.5: Minimum confidence (0.5)
        # -N 50: Number of rules to find
        associator = Associator(
            classname="weka.associations.Apriori", 
            options=["-Z", "-T", "0", "-C", "0.5", "-N", "50"]
        )
        associator.build_associations(data)

        print("Parsing association rules...")
        rules_list = []
        output_lines = str(associator).splitlines()
        
        for line in output_lines:
            if "==>" not in line:
                continue
            
            try:
                parts = line.split("==>")
                if len(parts) != 2: continue
                
                lhs_raw = parts[0].strip()
                rhs_raw = parts[1].strip()

                conf_match = re.search(r'<conf:\(([\d\.]+)\)>', rhs_raw)
                confidence = float(conf_match.group(1)) if conf_match else 0.0

                lhs_items = extract_items_from_string(lhs_raw, is_lhs=True)

                rhs_items_part = rhs_raw.split('<')[0]
                rhs_items = extract_items_from_string(rhs_items_part, is_lhs=False)
                
                if lhs_items and rhs_items:
                    rule_obj = {
                        "lhs": [item.lower() for item in lhs_items],
                        "rhs": rhs_items[0].title(),
                        "confidence": confidence
                    }
                    rules_list.append(rule_obj)
                    
            except Exception as e:
                print(f"Skipping malformed line: {line} | Error: {e}")

        print(f"Found {len(rules_list)} rules.")
        
        with open(OUTPUT_JSON, "w") as f:
            json.dump(rules_list, f, indent=2)
            
        print(f"Successfully saved rules to {OUTPUT_JSON}")

    except Exception as e:
        traceback.print_exc()
    finally:
        jvm.stop()

if __name__ == "__main__":
    build_predictor()