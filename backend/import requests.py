import requests

# API endpoint
url = "http://localhost:8000/predict-waste"

# Image file path - Change this to your actual image path
image_path = "sample_waste.jpg"

try:
    with open(image_path, "rb") as img_file:
        files = {"image": img_file}
        response = requests.post(url, files=files)
    
    print("Status Code:", response.status_code)
    print("Response:", response.json())
except FileNotFoundError:
    print(f"Error: Image file '{image_path}' not found")
except Exception as e:
    print(f"Error: {str(e)}")