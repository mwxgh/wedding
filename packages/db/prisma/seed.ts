import 'dotenv/config';

import bcrypt from 'bcryptjs';

import { Relation, Side, createPrismaClient } from '../src/index.js';

const prisma = createPrismaClient(process.env.DATABASE_URL!);

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password)
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');

  await prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash: await bcrypt.hash(password, 10) },
    update: {},
  });

  // Sample content below is only created on an empty database
  if (await prisma.weddingInfo.findUnique({ where: { id: 1 } })) {
    console.log('Admin ensured; sample data already present, skipping.');
    return;
  }

  await prisma.weddingInfo.create({
    data: {
      id: 1,
      brideName: 'Thu Hà',
      groomName: 'Minh Tuấn',
      brideParents: 'Ông Nguyễn Văn A & Bà Trần Thị B',
      groomParents: 'Ông Lê Văn C & Bà Phạm Thị D',
      // a calendar day; event times hang off it (Event.dayOffset/startTime)
      weddingDate: new Date('2027-01-16T00:00:00+07:00'),
      story:
        'Chúng mình gặp nhau vào một chiều mưa Hà Nội. Sau 5 năm bên nhau, chúng mình quyết định về chung một nhà.',
    },
  });

  const [vuQuy, thanhHon] = await Promise.all([
    prisma.event.create({
      data: {
        name: 'Lễ Vu Quy',
        side: Side.BRIDE,
        dayOffset: 0,
        startTime: '09:00',
        startAt: new Date('2027-01-16T09:00:00+07:00'),
        venueName: 'Tư gia nhà gái',
        address: '12 Phố Huế, Hai Bà Trưng, Hà Nội',
        sortOrder: 1,
      },
    }),
    prisma.event.create({
      data: {
        name: 'Tiệc Thành Hôn',
        side: Side.BOTH,
        dayOffset: 0,
        startTime: '11:30',
        startAt: new Date('2027-01-16T11:30:00+07:00'),
        venueName: 'Trung tâm tiệc cưới Hoa Sen',
        address: '88 Láng Hạ, Đống Đa, Hà Nội',
        mapUrl: 'https://maps.google.com/?q=88+Lang+Ha+Ha+Noi',
        sortOrder: 2,
      },
    }),
  ]);

  await prisma.table.createMany({
    data: [1, 2, 3].map((n) => ({
      eventId: thanhHon.id,
      name: `Bàn ${n}`,
      capacity: 10,
    })),
  });

  await prisma.album.createMany({
    data: [
      { title: 'Ảnh cưới', sortOrder: 1 },
      { title: 'Khoảnh khắc từ khách mời', isGuest: true, sortOrder: 2 },
    ],
  });

  const invitation = await prisma.invitation.create({
    data: {
      code: 'demo123456',
      name: 'Gia đình anh Nam',
      side: Side.GROOM,
      relation: Relation.FRIEND,
      maxGuests: 3,
      guests: {
        create: [
          { name: 'Anh Nam' },
          { name: 'Chị Lan' },
          { name: 'Bé Na', isChild: true },
        ],
      },
      events: { create: [{ eventId: vuQuy.id }, { eventId: thanhHon.id }] },
    },
  });

  console.log(`Seeded sample data. Demo invitation: /i/${invitation.code}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
