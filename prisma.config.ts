import { config as loadEnv } from "dotenv";

// Локальные секреты живут в .env.local (его читает Next), .env — как fallback.
// CLI Prisma (contract emit, db verify/sign/infer) берёт соединение отсюда.
loadEnv({ path: [".env.local", ".env"], quiet: true });

import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
  orm: ormConfig({
    contract: "./prisma/contract.prisma",
    db: {
      connection: process.env["DATABASE_URL"]!,
    },
  }),
});
