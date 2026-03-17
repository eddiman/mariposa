import path from 'path';
import os from 'os';

export const config = {
  port: parseInt(process.env.MARIPOSA_PORT || '3020'),
  host: process.env.MARIPOSA_HOST || '0.0.0.0',
  configDir: path.join(os.homedir(), '.mariposa'),
  get configFile() {
    return path.join(this.configDir, 'config.json');
  },
};
