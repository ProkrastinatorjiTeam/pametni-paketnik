from flask import Flask
import os

def create_app():
    app = Flask(__name__)
    app.config.from_pyfile('config.py')

    base_upload_folder_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), app.config['BASE_UPLOAD_FOLDER'])
    if not os.path.exists(base_upload_folder_path):
        try:
            os.makedirs(base_upload_folder_path)
            print(f"Created base upload directory from main: {base_upload_folder_path}")
        except OSError as e:
            print(f"Error creating base upload directory from main {base_upload_folder_path}: {e}")

    from src.routes import api_bp
    app.register_blueprint(api_bp)
    return app

app = create_app()
if __name__ == '__main__':
    app.run(
        host=app.config.get('HOST', '0.0.0.0'),
        port=app.config.get('PORT', 3002),
        debug=app.config.get('DEBUG', True)
    )