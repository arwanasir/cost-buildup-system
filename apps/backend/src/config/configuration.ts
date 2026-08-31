export interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password?: string;
    database: string;
    url: string;
}

export interface jwtConfig {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
}

export interface MinioConfig {
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
}

export interface SmtpConfig {
    host: string;
    port: number;
    user?: string;
    pass?: string;
    from: string;
}

export interface ErpConfig {
    baseUrl: string;
    apiKey: string;
}
export interface AppConfig {
    port: number;
    nodeEnv: string;
    database: DatabaseConfig;
    jwt: jwtConfig;
    minio: MinioConfig;
    smtp: SmtpConfig;
    erp: ErpConfig;
}

export default (): AppConfig => ({
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || '',
        database: process.env.POSTGRES_DB || 'cost_buildup_db',
        url: process.env.DATABASE_URL || `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || ''}:@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'cost_buildup_db'
            }`,
    },
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    },
    minio: {
        endpoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000', 10),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
        secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin_password',
        bucket: process.env.MINIO_BUCKET || 'cost-buildup-documents',
    },
    smtp: {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '1025', 10),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || 'noreply@costbuildup.local',
    },
    erp: {
        baseUrl: process.env.ERP_BASE_URL || 'http://localhost:3001',
        apiKey: process.env.ERP_API_KEY || 'mock_erp_key'
    }
})