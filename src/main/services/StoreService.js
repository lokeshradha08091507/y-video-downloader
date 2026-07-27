const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class StoreService {
  constructor() {
    try {
      this.userDataPath = app.getPath('userData');
    } catch (e) {
      this.userDataPath = path.join(process.cwd(), '.data');
    }

    if (!fs.existsSync(this.userDataPath)) {
      fs.mkdirSync(this.userDataPath, { recursive: true });
    }

    this.settingsFilePath = path.join(this.userDataPath, 'settings.json');
    this.defaults = {
      downloadDir: this.getDefaultDownloadDir(),
      theme: 'dark',
      maxConcurrentDownloads: 3,
      rememberFolder: true,
      history: []
    };

    this.data = this.load();
  }

  getDefaultDownloadDir() {
    try {
      return app.getPath('downloads');
    } catch (e) {
      return path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Downloads');
    }
  }

  load() {
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const raw = fs.readFileSync(this.settingsFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        return { ...this.defaults, ...parsed };
      }
    } catch (err) {
      console.error('Error loading settings, using defaults:', err);
    }
    return { ...this.defaults };
  }

  save() {
    try {
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  }

  get(key) {
    return this.data[key] !== undefined ? this.data[key] : this.defaults[key];
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  getAll() {
    return { ...this.data };
  }

  updateAll(newSettings) {
    this.data = { ...this.data, ...newSettings };
    this.save();
    return this.data;
  }
}

module.exports = new StoreService();
