import uvicorn
import logging
from api.admin_api import socket_app as app

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)