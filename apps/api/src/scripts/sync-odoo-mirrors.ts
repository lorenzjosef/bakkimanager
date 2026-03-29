import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BakkiTaskMirrorService } from '../bakki-core/bakki-task-mirror.service';
import { BakkiUserMirrorService } from '../bakki-core/bakki-user-mirror.service';
import { OdooService } from '../odoo/odoo.service';
import { TasksService } from '../modules/tasks/tasks.service';
import { UsersService } from '../modules/users/users.service';

async function main() {
  const args = new Set(process.argv.slice(2));
  const json = args.has('--json');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const bakkiTasks = app.get(BakkiTaskMirrorService);
    const bakkiUsers = app.get(BakkiUserMirrorService);
    const odoo = app.get(OdooService);
    const tasksService = app.get(TasksService);
    const usersService = app.get(UsersService);

    const mirrorsConfigured = bakkiTasks.isConfigured() && bakkiUsers.isConfigured();

    let users;
    let tasks;
    let message: string;

    if (!odoo.isConfigured()) {
      users = { fetched: 0, synced: 0, failed: 0 };
      tasks = { fetched: 0, synced: 0, failed: 0 };
      message = 'Odoo service credentials are not configured.';
    } else {
      [users, tasks] = await Promise.all([
        usersService.refreshMirrorsFromOdoo(),
        tasksService.refreshMirrorsFromOdoo(),
      ]);

      message = !mirrorsConfigured
        ? 'Odoo connectivity is live, but Bakki Core mirrors are not configured in this environment.'
        : users.failed === 0 && tasks.failed === 0
          ? 'Odoo mirror sync completed successfully.'
          : 'Odoo mirror sync completed with partial failures.';
    }

    const result = {
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      mirrorsConfigured,
      message,
      users,
      tasks,
    };

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`Odoo configured: ${odoo.isConfigured() ? 'yes' : 'no'}`);
    console.log(`Bakki mirrors configured: ${mirrorsConfigured ? 'yes' : 'no'}`);
    console.log(`Message: ${message}`);
    console.log(`Users: fetched=${users.fetched} synced=${users.synced} failed=${users.failed}`);
    console.log(`Tasks: fetched=${tasks.fetched} synced=${tasks.synced} failed=${tasks.failed}`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Odoo mirror sync failed: ${message}`);
  process.exitCode = 1;
});
