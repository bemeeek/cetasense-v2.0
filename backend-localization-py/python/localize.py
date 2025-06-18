import argparse, json, pandas as pd, pickle

def run_localization(data_path, model_path):
    df = pd.read_csv(data_path)
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    x,y = model.predict(df)[0]
    return x,y

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run localization on data")
    parser.add_argument("--data_path", type=str, required=True, help="Path to the input data CSV file")
    parser.add_argument("--model_path", type=str, required=True, help="Path to the trained model pickle file")
    
    args = parser.parse_args()
    
    x, y = run_localization(args.data_path, args.model_path)
    
    result = {
        "x": x,
        "y": y
    }
    
    print(json.dumps(result))