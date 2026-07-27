/**
 * Abstract Base Class for Video Downloader Providers.
 * Custom providers should inherit from this class and implement canHandle, analyze, and download.
 */
class BaseProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Determine whether this provider can handle the given URL.
   * @param {string} url 
   * @returns {boolean}
   */
  canHandle(url) {
    throw new Error('canHandle method must be implemented by Provider');
  }

  /**
   * Extract video metadata and format options for the given URL.
   * @param {string} url 
   * @returns {Promise<Object>} Metadata object: { id, title, thumbnail, duration, author, formats: [...] }
   */
  async analyze(url) {
    throw new Error('analyze method must be implemented by Provider');
  }

  /**
   * Execute video/audio download.
   * @param {Object} options { downloadId, url, format, destDir, filename }
   * @param {Function} progressCallback ({ percentage, speedBytesPerSec, etaSeconds, downloadedBytes, totalBytes })
   * @param {AbortController} abortController
   * @returns {Promise<string>} Saved file path
   */
  async download(options, progressCallback, abortController) {
    throw new Error('download method must be implemented by Provider');
  }
}

module.exports = BaseProvider;
