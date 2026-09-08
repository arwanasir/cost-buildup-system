import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as net from 'net';
import { Pool } from 'pg';

export interface HealthCheckResponse {
    status: 'ok' | 'degraded' | 'down';
    timestamp: string;
    version: '1.0.0-dev',
    dependencies: {
        db: 'up' | 'down';
        minio: 'up' | 'down';
        smtp: 'up' | 'down';
    };
}
@Controller('health')
export class HealthController {
    private readonly dbPool: Pool;

    constructor(private readonly configService: ConfigService) {
        this.dbPool = new Pool({
            connectionString: this.configService.get<string>('database.url'),
            connectionTimeoutMillis: 3000,
        });
    }

    @Get()
    async checkHealth(): Promise<HealthCheckResponse> {
        const [dbUp, minioUp, smtpUp] = await Promise.all([
            this.checkDatabase(),
            this.checkMinio(),
            this.checkSmtp(),
        ]);

        const allUp = dbUp && minioUp && smtpUp;
        const anyUp = dbUp || minioUp || smtpUp;
        const status = allUp ? 'ok' : anyUp ? 'degraded' : 'down';
        const response: HealthCheckResponse = {
            status,
            timestamp: new Date().toISOString(),
            version: '1.0.0-dev',
            dependencies: {
                db: dbUp ? 'up' : 'down',
                minio: minioUp ? 'up' : 'down',
                smtp: smtpUp ? 'up' : 'down',
            },
        };
        if (status === 'down') {
            throw new ServiceUnavailableException(response);
        }
        return response;

    }
    private async checkDatabase(): Promise<boolean> {
        try {
            const client = await this.dbPool.connect();
            await client.query('SELECT 1');
            client.release();
            return true;
        } catch {
            return false;
        }
    }

    private async checkMinio(): Promise<boolean> {
        const host = this.configService.get<string>('minio.endpoint');
        const port = this.configService.get<number>('minio.port');
        const useSSL = this.configService.get<boolean>('minio.useSSl');
        const protocol = useSSL ? 'https' : 'http';
        const url = `${protocol}://${host}:${port}/minio/health/live`;
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
            return res.ok;
        } catch {
            return false;
        }
    }

    private checkSmtp(): Promise<boolean> {
        return new Promise((resolve) => {
            const host = this.configService.get<string>('smtp.host') || 'localhost';
            const port = this.configService.get<number>('smtp.port') || 1025;

            const socket = new net.Socket();
            socket.setTimeout(3000);

            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });

            socket.connect(port, host);
        })
    }
}
