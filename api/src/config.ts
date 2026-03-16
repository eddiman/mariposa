import path from 'path';
import os from 'os';

export const config = {
  port: 3020,
  host: '0.0.0.0',
  configDir: path.join(os.homedir(), '.mariposa'),
  get configFile() {
    return path.join(this.configDir, 'config.json');
  },
};
