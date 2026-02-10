import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo1234', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@codexforge.dev' },
    update: {},
    create: {
      email: 'demo@codexforge.dev',
      username: 'demo',
      passwordHash,
      displayName: 'Demo User',
      role: 'user',
      plan: 'pro',
    },
  });

  console.log(`Created user: ${user.username} (${user.email})`);

  // Create demo project
  const project = await prisma.project.upsert({
    where: { id: 'demo-project-1' },
    update: {},
    create: {
      id: 'demo-project-1',
      userId: user.id,
      name: 'My Awesome App',
      description: 'A demo project to showcase Codex Forge capabilities',
      language: 'TypeScript',
      framework: 'React + Express',
    },
  });

  console.log(`Created project: ${project.name}`);

  // Create sample tasks
  const taskTypes = ['feature', 'bugfix', 'refactor', 'test'] as const;
  const statuses = ['completed', 'completed', 'queued', 'failed'] as const;

  for (let i = 0; i < 4; i++) {
    await prisma.codingTask.create({
      data: {
        userId: user.id,
        projectId: project.id,
        title: `Sample ${taskTypes[i]} task #${i + 1}`,
        description: `This is a sample ${taskTypes[i]} task created during database seeding.`,
        taskType: taskTypes[i],
        priority: 'medium',
        status: statuses[i],
        branch: `codex-forge/${taskTypes[i]}/demo-${i + 1}`,
        completedAt: statuses[i] === 'completed' ? new Date() : undefined,
        failedAt: statuses[i] === 'failed' ? new Date() : undefined,
        errorMessage: statuses[i] === 'failed' ? 'Demo error for testing' : undefined,
      },
    });
  }

  console.log('Created 4 sample tasks');

  // Create sample audit logs
  await prisma.fileAuditLog.createMany({
    data: [
      {
        userId: user.id,
        projectId: project.id,
        filePath: 'src/components/App.tsx',
        action: 'read',
        wasReadFirst: true,
        guardPassed: true,
        readAt: new Date(),
        guardMessage: 'File read recorded successfully',
      },
      {
        userId: user.id,
        projectId: project.id,
        filePath: 'src/components/App.tsx',
        action: 'write',
        wasReadFirst: true,
        guardPassed: true,
        writeAt: new Date(),
        guardMessage: 'Write operation completed after read verification',
      },
      {
        userId: user.id,
        projectId: project.id,
        filePath: 'src/utils/helpers.ts',
        action: 'read',
        wasReadFirst: true,
        guardPassed: true,
        readAt: new Date(),
        guardMessage: 'File read recorded successfully',
      },
    ],
  });

  console.log('Created sample audit logs');
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
