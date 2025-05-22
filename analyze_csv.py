import pandas as pd

def analyze_csv(file_path):
    df = pd.read_csv(file_path)
    print("\nColumn Length Analysis:")
    for col in df.columns:
        try:
            # For string columns
            max_length = df[col].astype(str).str.len().max()
            print(f"{col}: {max_length}")
        except Exception as e:
            # For numeric columns
            print(f"{col}: numeric")

if __name__ == "__main__":
    analyze_csv('mobiledokan_data.csv')
