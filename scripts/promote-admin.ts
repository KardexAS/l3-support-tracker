import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.argv[2]?.trim();

  if (!username) {
    console.error(
      "Missing GitHub username argument.\n" +
        "Usage: npm run promote-admin -- <github-username>"
    );
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { name: username },
    select: { id: true, name: true, email: true, roles: true, verified: true },
  });

  if (!user) {
    console.error(
      `No user found with GitHub username '${username}'.\n` +
        "Sign in with GitHub once, then rerun this script."
    );
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      roles: { set: ["ADMIN", "ENGINEER"] },
      verified: true,
      isActive: true,
    },
    select: { id: true, name: true, email: true, roles: true, verified: true },
  });

  console.log("Promoted user to ADMIN:");
  console.log(`  id:       ${updated.id}`);
  console.log(`  name:     ${updated.name}`);
  console.log(`  email:    ${updated.email ?? "(none)"}`);
  console.log(`  roles:    ${updated.roles.join(", ")}`);
  console.log(`  verified: ${updated.verified}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
