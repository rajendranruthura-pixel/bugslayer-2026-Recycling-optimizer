import requests
import io

# Create a simple dummy image (JPEG signature)
dummy_image = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x03\x01\x22\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00\xbf\x80\xff\xd9'

url = "http://localhost:8000/predict-waste"

try:
    files = {"image": ("test.jpg", io.BytesIO(dummy_image), "image/jpeg")}
    print(f"Sending request to {url}...")
    response = requests.post(url, files=files)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response:", response.json())
    else:
        print("Error Response:", response.text)

except Exception as e:
    print(f"Request failed: {e}")
