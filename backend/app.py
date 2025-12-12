from flask import Flask
from dotenv import load_dotenv, find_dotenv
from routes import api_bp

# Load environment variables
# find_dotenv() automatically searches up the directory tree for .env
load_dotenv()

app = Flask(__name__)

# Register blueprint
app.register_blueprint(api_bp)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)