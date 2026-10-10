function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  webOrigins: (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim()),
  databaseUrl: () => required('DATABASE_URL'),
  jwt: {
    secret: () => required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  s3: {
    endpoint: () => required('S3_ENDPOINT'),
    region: process.env.S3_REGION ?? 'us-east-1',
    accessKey: () => required('S3_ACCESS_KEY'),
    secretKey: () => required('S3_SECRET_KEY'),
    bucket: process.env.S3_BUCKET ?? 'wedding',
  },
  uploadMaxBytes: Number(process.env.UPLOAD_MAX_MB ?? 15) * 1024 * 1024,
};
