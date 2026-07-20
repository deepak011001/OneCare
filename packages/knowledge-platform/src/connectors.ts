import type {
  ConnectorDocument,
  KnowledgeSourceConfig,
  KnowledgeSourceSystem,
  SyncCheckpoint,
  SyncMode,
} from './types';
import type { ConnectorRegistryPort, KnowledgeConnectorPort } from './ports';

export class InMemoryConnectorRegistry implements ConnectorRegistryPort {
  private readonly connectors = new Map<KnowledgeSourceSystem, KnowledgeConnectorPort>();

  register(connector: KnowledgeConnectorPort): void {
    this.connectors.set(connector.type, connector);
  }

  get(type: KnowledgeSourceSystem): KnowledgeConnectorPort | undefined {
    return this.connectors.get(type);
  }

  list(): readonly KnowledgeConnectorPort[] {
    return [...this.connectors.values()];
  }
}

abstract class StubConnector implements KnowledgeConnectorPort {
  abstract readonly type: KnowledgeSourceSystem;
  abstract readonly displayName: string;

  async health(): Promise<'stub'> {
    return 'stub';
  }

  async listDocuments(_input: {
    readonly tenantId: string;
    readonly source: KnowledgeSourceConfig;
    readonly checkpoint?: SyncCheckpoint;
    readonly mode: SyncMode;
  }): Promise<readonly ConnectorDocument[]> {
    return [];
  }
}

export class SharePointConnectorStub extends StubConnector {
  readonly type = 'sharepoint' as const;
  readonly displayName = 'SharePoint';
}

export class ConfluenceConnectorStub extends StubConnector {
  readonly type = 'confluence' as const;
  readonly displayName = 'Confluence';
}

export class GoogleDriveConnectorStub extends StubConnector {
  readonly type = 'google_drive' as const;
  readonly displayName = 'Google Drive';
}

export class OneDriveConnectorStub extends StubConnector {
  readonly type = 'onedrive' as const;
  readonly displayName = 'OneDrive';
}

export class NotionConnectorStub extends StubConnector {
  readonly type = 'notion' as const;
  readonly displayName = 'Notion';
}

export class HrmsApiConnectorStub extends StubConnector {
  readonly type = 'hrms_api' as const;
  readonly displayName = 'HRMS Knowledge API';
}

export class WikiConnectorStub extends StubConnector {
  readonly type = 'wiki' as const;
  readonly displayName = 'Wiki';
}

/** Local / markdown / html / pdf / docx / csv — in-memory catalog from source.options.documents */
export class LocalFilesConnector implements KnowledgeConnectorPort {
  readonly type: KnowledgeSourceSystem;
  readonly displayName: string;

  constructor(type: KnowledgeSourceSystem = 'local_files') {
    this.type = type;
    this.displayName = type.replace('_', ' ');
  }

  async health(): Promise<'healthy'> {
    return 'healthy';
  }

  async listDocuments(input: {
    readonly tenantId: string;
    readonly source: KnowledgeSourceConfig;
    readonly checkpoint?: SyncCheckpoint;
    readonly mode: SyncMode;
  }): Promise<readonly ConnectorDocument[]> {
    const raw = input.source.options?.['documents'];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((d): d is Record<string, unknown> => Boolean(d) && typeof d === 'object')
      .map((d, i) => ({
        externalId: String(d['externalId'] ?? d['id'] ?? `doc-${i}`),
        title: String(d['title'] ?? 'Untitled'),
        body: String(d['body'] ?? ''),
        ...(typeof d['contentType'] === 'string' ? { contentType: d['contentType'] } : {}),
        ...(typeof d['sourceUri'] === 'string' ? { sourceUri: d['sourceUri'] } : {}),
        ...(typeof d['owner'] === 'string' ? { owner: d['owner'] } : {}),
        lastModified: String(d['lastModified'] ?? new Date().toISOString()),
        ...(d['deleted'] === true ? { deleted: true } : {}),
        ...(typeof d['versionHint'] === 'number' ? { versionHint: d['versionHint'] } : {}),
      }));
  }
}

export function registerDefaultConnectors(registry: ConnectorRegistryPort): void {
  for (const c of [
    new SharePointConnectorStub(),
    new ConfluenceConnectorStub(),
    new GoogleDriveConnectorStub(),
    new OneDriveConnectorStub(),
    new NotionConnectorStub(),
    new HrmsApiConnectorStub(),
    new WikiConnectorStub(),
    new LocalFilesConnector('local_files'),
    new LocalFilesConnector('markdown'),
    new LocalFilesConnector('html'),
    new LocalFilesConnector('pdf'),
    new LocalFilesConnector('docx'),
    new LocalFilesConnector('csv'),
  ]) {
    registry.register(c);
  }
}
