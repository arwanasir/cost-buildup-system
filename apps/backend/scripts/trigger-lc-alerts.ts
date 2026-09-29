import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { LcAlertScheduler } from '../src/letters-of-credit/lc-alert.scheduler';
import { DRIZZLE } from '../src/db';
import * as schema from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';
import * as http from 'http';

function checkMailpit() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:8025/api/v1/messages', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function bootstrap() {
  console.log('Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const scheduler = app.get(LcAlertScheduler);
  const db = app.get(DRIZZLE);

  console.log('\n--- 1. Executing LcAlertScheduler.checkLcAlerts() manually ---');
  await scheduler.checkLcAlerts();

  console.log('\n--- 2. Verifying in_app notification rows in database ---');
  // Wait a moment for async notifications to insert
  await new Promise(r => setTimeout(r, 1000));
  
  const recentNotifications = await db.select()
    .from(schema.notifications)
    .orderBy(desc(schema.notifications.createdAt))
    .limit(5);

  if (recentNotifications.length > 0) {
    console.log(`Found ${recentNotifications.length} recent notifications:`);
    recentNotifications.forEach((n: any) => {
      console.log(` - ID: ${n.id} | Type: ${n.type} | UserID: ${n.userId} | Title: ${n.titleEn}`);
    });
  } else {
    console.log('No recent notifications found in DB. (Make sure you have an LC approaching expiry/shipment or in docs_received state).');
  }

  console.log('\n--- 3. Verifying emails in Mailpit API ---');
  try {
    const data: any = await checkMailpit();
    if (data.messages && data.messages.length > 0) {
      const msgs = data.messages.slice(0, 5); // get top 5
      console.log(`Found ${data.messages.length} total emails in Mailpit. Recent ones:`);
      msgs.forEach((m: any) => {
        console.log(` - Subject: "${m.Subject}" | To: ${m.To[0].Address}`);
      });
    } else {
      console.log('Mailpit is empty.');
    }
  } catch (err: any) {
    console.log('Failed to connect to Mailpit API. Is Mailpit running on port 8025? Error:', err.message);
  }

  await app.close();
  process.exit(0);
}

bootstrap();