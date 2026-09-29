import { definePrismaConfig } from "prisma/config";
import "dotenv/config";

export default definePrismaConfig({
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
  orm: {
    schema: 'prisma/schema.prisma',
    db: {
      connection: process.env.DATABASE_URL,
    },
  },
});
