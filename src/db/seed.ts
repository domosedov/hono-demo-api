import { faker } from "@faker-js/faker";
import { db } from "./client";
import * as schema from "./schema";

const users = await db
  .insert(schema.usersTable)
  .values(
    Array.from({ length: 5 }, () => ({
      email: faker.internet.email(),
      password: Bun.password.hashSync(faker.internet.password()),
      name: faker.person.fullName(),
    }))
  )
  .returning({ id: schema.usersTable.id });

users.forEach(async ({ id }) => {
  await db.insert(schema.todosTable).values(
    Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
      title: faker.lorem.text(),
      description: faker.lorem.paragraph(),
      completed: faker.datatype.boolean(),
      userId: id,
    }))
  );
});

console.log(`Seeding complete.`);
