from flask import Flask
import os

def create_app():
    app = Flask(__name__)
    app.config.from_pyfile('config.py')
    project_root_dir = os.path.dirname(os.path.abspath(__file__))
    base_upload_folder_path = os.path.join(project_root_dir, app.config['BASE_UPLOAD_FOLDER'])
    
    if not os.path.exists(base_upload_folder_path):
        try:
            os.makedirs(base_upload_folder_path)
            log_message = f"Created base upload directory from main: {base_upload_folder_path}"
            if hasattr(app, 'logger'):
                app.logger.info(log_message)
            else:
                print(log_message)
        except OSError as e:
            error_message = f"Error creating base upload directory from main {base_upload_folder_path}: {e}"
            if hasattr(app, 'logger'):
                app.logger.error(error_message)
            else:
                print(error_message)

    from src.server.routes import api_bp
    app.register_blueprint(api_bp)
    return app

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        app.run(
            host=app.config.get('HOST', '0.0.0.0'),
            port=app.config.get('PORT', 3002),
            debug=app.config.get('DEBUG', True)
        )