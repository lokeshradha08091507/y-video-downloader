const SampleProvider = require('./providers/SampleProvider');
const DirectHttpProvider = require('./providers/DirectHttpProvider');
const YtDlpProvider = require('./providers/YtDlpProvider');

class ProviderManager {
  constructor() {
    this.providers = [];
    
    // Register standard default providers in priority order
    this.registerProvider(new SampleProvider());
    this.registerProvider(new DirectHttpProvider());
    this.registerProvider(new YtDlpProvider());
  }

  /**
   * Register a new video provider plugin.
   * @param {BaseProvider} provider 
   */
  registerProvider(provider) {
    if (!provider || typeof provider.canHandle !== 'function') {
      throw new Error('Invalid provider instance. Must extend BaseProvider.');
    }
    this.providers.push(provider);
  }

  /**
   * Resolve provider capable of processing URL.
   * @param {string} url 
   * @returns {BaseProvider}
   */
  getProviderForUrl(url) {
    for (const provider of this.providers) {
      try {
        if (provider.canHandle(url)) {
          return provider;
        }
      } catch (e) {
        console.warn(`Provider ${provider.name} failed canHandle check:`, e);
      }
    }
    // Fallback to YtDlpProvider or DirectHttpProvider
    return this.providers.find(p => p.name === 'YtDlpProvider') || this.providers[0];
  }

  /**
   * Analyze URL via suitable provider.
   * @param {string} url 
   */
  async analyze(url) {
    if (!url || typeof url !== 'string' || !url.trim()) {
      throw new Error('Invalid URL provided. Please paste a valid web address or sample URL.');
    }

    const trimmedUrl = url.trim();
    const provider = this.getProviderForUrl(trimmedUrl);
    
    if (!provider) {
      throw new Error('No compatible video provider found for this URL.');
    }

    const metadata = await provider.analyze(trimmedUrl);
    return {
      ...metadata,
      providerName: provider.name
    };
  }

  /**
   * Get list of registered provider names
   */
  getRegisteredProviders() {
    return this.providers.map(p => p.name);
  }
}

module.exports = new ProviderManager();
