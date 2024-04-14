import { faker } from "@faker-js/faker";
import { hashPassword } from "../lib/password-hash";
import { db } from "./db";
import * as schema from "./schema";

const users = await db
  .insert(schema.usersTable)
  .values(
    Array.from({ length: 5 }, () => ({
      email: faker.internet.email(),
      password: hashPassword(faker.internet.password()),
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
