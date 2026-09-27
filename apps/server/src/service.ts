import { GitHubReadOnlyClient } from '@ads-plane/github-adapter';
import { reduceRepositoryFacts } from '@ads-plane/reducer';
import { SnapshotStore, type RepositoryConfig } from '@ads-plane/storage';

export class ObserverService {
  private client: GitHubReadOnlyClient;

  constructor(client: GitHubReadOnlyClient, private readonly store: SnapshotStore) {
    this.client = client;
  }

  setClient(client: GitHubReadOnlyClient): void { this.client = client; }

  unregister(repository: string): void { this.store.unregister(repository); }

  register(config: RepositoryConfig): void { this.store.register(config); }

  async sync(config: RepositoryConfig) {
    const facts = await this.client.collect(config.repository);
    const snapshot = reduceRepositoryFacts(facts, config.versionHint);
    this.store.save(snapshot);
    return snapshot;
  }

  async syncAll(): Promise<Array<{repository: string; ok: boolean; error?: string}>> {
    const results: Array<{repository: string; ok: boolean; error?: string}> = [];
    for (const config of this.store.listConfigs()) {
      try { await this.sync(config); results.push({repository: config.repository, ok: true}); }
      catch (error) { results.push({repository: config.repository, ok: false, error: error instanceof Error ? error.message : String(error)}); }
    }
    return results;
  }

  list() { return this.store.listSummaries(); }
  get(repository: string) { return this.store.get(repository); }
  configs() { return this.store.listConfigs(); }
}
